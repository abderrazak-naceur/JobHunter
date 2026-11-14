using System.Globalization;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.RegularExpressions;
using JobHunter.Api.Domain;
using Microsoft.Extensions.Configuration;

namespace JobHunter.Api.Infrastructure.JobDiscovery;

public interface IJobBoardClient
{
    Task<IReadOnlyList<JobPostingRecord>> FetchAsync(
        JobSource source,
        JobSearchProfile? profile,
        CancellationToken cancellationToken);
}

public sealed record JobPostingRecord(
    string ExternalId,
    string Title,
    string CompanyName,
    string Location,
    string WorkMode,
    string SalaryText,
    string Description,
    string SourceUrl,
    string ApplyUrl,
    DateTimeOffset? PublishedAt,
    DateTimeOffset? SourceUpdatedAt);

/// <summary>
/// Reads public listings from documented fixed HTTPS endpoints.
/// Aggregators are queried automatically; company ATS boards remain optional manual sources.
/// </summary>
public sealed class JobBoardClient(HttpClient httpClient, IConfiguration? configuration = null) : IJobBoardClient
{
    private const int MaximumDescriptionLength = 8000;
    private const int MaximumResponseBytes = 5_000_000;

    public async Task<IReadOnlyList<JobPostingRecord>> FetchAsync(
        JobSource source,
        JobSearchProfile? profile,
        CancellationToken cancellationToken)
    {
        var provider = source.Provider.Trim().ToLowerInvariant();

        if (provider == "arbeitnow")
            return await FetchArbeitnowAsync(cancellationToken);

        if (provider == "jobicy")
            return await FetchJobicyAsync(cancellationToken);

        if (provider == "adzuna")
            return await FetchAdzunaAsync(profile, source.BoardIdentifier, cancellationToken);

        if (provider == "jooble")
            return await FetchJoobleAsync(profile, cancellationToken);

        if (!Regex.IsMatch(source.BoardIdentifier, "^[A-Za-z0-9_-]{1,120}$", RegexOptions.CultureInvariant))
            throw new InvalidOperationException("Identificativo della board non valido.");

        var endpoint = provider switch
        {
            "lever" => $"https://api.lever.co/v0/postings/{Uri.EscapeDataString(source.BoardIdentifier)}?mode=json",
            "lever-eu" => $"https://api.eu.lever.co/v0/postings/{Uri.EscapeDataString(source.BoardIdentifier)}?mode=json",
            "greenhouse" => $"https://boards-api.greenhouse.io/v1/boards/{Uri.EscapeDataString(source.BoardIdentifier)}/jobs?content=true",
            _ => throw new InvalidOperationException("Provider non supportato.")
        };

        using var document = await GetJsonAsync(endpoint, cancellationToken);
        return provider is "lever" or "lever-eu"
            ? ParseLever(document.RootElement, source.CompanyName)
            : ParseGreenhouse(document.RootElement, source.CompanyName);
    }

    private async Task<IReadOnlyList<JobPostingRecord>> FetchArbeitnowAsync(CancellationToken cancellationToken)
    {
        // Arbeitnow exposes a free public API. The feed is updated hourly; one page is requested per manual search.
        using var document = await GetJsonAsync("https://www.arbeitnow.com/api/job-board-api?page=1", cancellationToken);
        if (!document.RootElement.TryGetProperty("data", out var data) || data.ValueKind != JsonValueKind.Array)
            return [];

        var results = new List<JobPostingRecord>();
        foreach (var item in data.EnumerateArray())
        {
            var id = Text(item, "slug");
            var title = Text(item, "title");
            var url = SafeHttpUrl(Text(item, "url"));
            if (id.Length == 0 || title.Length == 0 || url.Length == 0) continue;

            var description = PlainText(Text(item, "description"));
            var remote = item.TryGetProperty("remote", out var remoteValue) &&
                         remoteValue.ValueKind == JsonValueKind.True;
            var workMode = remote ? "Remote" : DetectWorkMode(title + " " + description);
            results.Add(new JobPostingRecord(
                id, title, Text(item, "company_name"), Text(item, "location"), workMode,
                ExtractSalary(description), Limit(description, MaximumDescriptionLength),
                url, url, UnixDate(item, "created_at"), null));
        }
        return results;
    }

    private async Task<IReadOnlyList<JobPostingRecord>> FetchJobicyAsync(CancellationToken cancellationToken)
    {
        // Public remote-job feed; keep the canonical Jobicy URL because free access does not expose direct ATS links.
        using var document = await GetJsonAsync(
            "https://jobicy.com/api/v2/remote-jobs?count=100&geo=europe&industry=engineering",
            cancellationToken);
        if (!document.RootElement.TryGetProperty("jobs", out var jobs) || jobs.ValueKind != JsonValueKind.Array)
            return [];

        var results = new List<JobPostingRecord>();
        foreach (var item in jobs.EnumerateArray())
        {
            var id = Text(item, "id");
            var title = Text(item, "jobTitle");
            var url = SafeHttpUrl(Text(item, "url"));
            if (id.Length == 0 || title.Length == 0 || url.Length == 0) continue;

            var description = PlainText(Text(item, "jobDescription"));
            var salaryPeriod = Text(item, "salaryPeriod");
            var salary = string.Equals(salaryPeriod, "yearly", StringComparison.OrdinalIgnoreCase)
                ? SalaryRange(DecimalText(item, "salaryMin"), DecimalText(item, "salaryMax")) + " annui"
                : string.Empty;
            DateTimeOffset? published = DateTimeOffset.TryParse(
                Text(item, "pubDate"), CultureInfo.InvariantCulture,
                DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal, out var pubDate)
                ? pubDate : null;

            results.Add(new JobPostingRecord(
                id, title, Text(item, "companyName"), Text(item, "jobGeo"), "Remote", salary,
                Limit(description, MaximumDescriptionLength), url, url, published, null));
        }
        return results;
    }

    private async Task<IReadOnlyList<JobPostingRecord>> FetchAdzunaAsync(
        JobSearchProfile? profile,
        string countryCode,
        CancellationToken cancellationToken)
    {
        var appId = configuration?["JobDiscovery:Adzuna:AppId"];
        var appKey = configuration?["JobDiscovery:Adzuna:AppKey"];
        if (string.IsNullOrWhiteSpace(appId) || string.IsNullOrWhiteSpace(appKey))
            throw new InvalidOperationException("Adzuna non è configurato: mancano AppId o AppKey.");

        if (!Regex.IsMatch(countryCode, "^[a-z]{2}$", RegexOptions.CultureInvariant))
            throw new InvalidOperationException("Codice paese Adzuna non valido.");

        var keywords = Limit(profile?.RoleKeywords ?? "software developer", 250);
        var location = Limit(string.IsNullOrWhiteSpace(profile?.Location) ? "Italia" : profile.Location, 120);
        var query = new List<string>
        {
            "app_id=" + Uri.EscapeDataString(appId),
            "app_key=" + Uri.EscapeDataString(appKey),
            "results_per_page=50",
            "what=" + Uri.EscapeDataString(keywords),
            "where=" + Uri.EscapeDataString(location),
            "content-type=application/json"
        };
        using var document = await GetJsonAsync(
            $"https://api.adzuna.com/v1/api/jobs/{countryCode}/search/1?{string.Join("&", query)}",
            cancellationToken);

        if (!document.RootElement.TryGetProperty("results", out var jobs) || jobs.ValueKind != JsonValueKind.Array)
            return [];

        var results = new List<JobPostingRecord>();
        foreach (var item in jobs.EnumerateArray())
        {
            var id = Text(item, "id");
            var title = Text(item, "title");
            var url = SafeHttpUrl(Text(item, "redirect_url"));
            if (id.Length == 0 || title.Length == 0 || url.Length == 0) continue;

            var description = PlainText(Text(item, "description"));
            var minimum = DecimalText(item, "salary_min");
            var maximum = DecimalText(item, "salary_max");
            var salary = SalaryRange(minimum, maximum);
            if (salary.Length == 0) salary = ExtractSalary(description);
            var locationName = NestedText(item, "location", "display_name");
            var company = NestedText(item, "company", "display_name");
            DateTimeOffset? published = DateTimeOffset.TryParse(
                Text(item, "created"), CultureInfo.InvariantCulture,
                DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal, out var created)
                ? created : null;

            results.Add(new JobPostingRecord(
                id, title, company, locationName, DetectWorkMode(title + " " + description), salary,
                Limit(description, MaximumDescriptionLength), url, url, published, null));
        }
        return results;
    }

    private async Task<IReadOnlyList<JobPostingRecord>> FetchJoobleAsync(
        JobSearchProfile? profile,
        CancellationToken cancellationToken)
    {
        var apiKey = configuration?["JobDiscovery:Jooble:ApiKey"];
        if (string.IsNullOrWhiteSpace(apiKey))
            throw new InvalidOperationException("Jooble non è configurato: manca la chiave API italiana.");

        var keywords = Limit(
            string.Join(" ", new[] { profile?.RoleKeywords, profile?.SkillKeywords }
                .Where(value => !string.IsNullOrWhiteSpace(value))), 200);
        var location = Limit(string.IsNullOrWhiteSpace(profile?.Location) ? "Italia" : profile.Location, 120);
        var payload = new Dictionary<string, object?>
        {
            ["keywords"] = keywords.Length == 0 ? "software developer" : keywords,
            ["location"] = location,
            ["page"] = "1",
            ["ResultOnPage"] = 50
        };
        using var document = await PostJsonAsync(
            $"https://it.jooble.org/api/{Uri.EscapeDataString(apiKey)}",
            payload,
            cancellationToken);

        if (!document.RootElement.TryGetProperty("jobs", out var jobs) || jobs.ValueKind != JsonValueKind.Array)
            return [];

        var results = new List<JobPostingRecord>();
        foreach (var item in jobs.EnumerateArray())
        {
            var id = Text(item, "id");
            var title = Text(item, "title");
            var url = SafeHttpUrl(Text(item, "link"));
            if (id.Length == 0 || title.Length == 0 || url.Length == 0) continue;

            var description = PlainText(Text(item, "snippet"));
            var updated = DateTimeOffset.TryParse(
                Text(item, "updated"), CultureInfo.InvariantCulture,
                DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal, out var timestamp)
                ? timestamp : (DateTimeOffset?)null;

            results.Add(new JobPostingRecord(
                id, title, Text(item, "company"), Text(item, "location"),
                DetectWorkMode(title + " " + description), Text(item, "salary"),
                Limit(description, MaximumDescriptionLength), url, url, updated, updated));
        }
        return results;
    }

    private async Task<JsonDocument> GetJsonAsync(string endpoint, CancellationToken cancellationToken)
    {
        using var response = await httpClient.GetAsync(
            endpoint, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
        return await ParseResponseAsync(response, cancellationToken);
    }

    private async Task<JsonDocument> PostJsonAsync(
        string endpoint,
        object payload,
        CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, endpoint)
        {
            Content = JsonContent.Create(payload)
        };
        using var response = await httpClient.SendAsync(
            request, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
        return await ParseResponseAsync(response, cancellationToken);
    }

    private static async Task<JsonDocument> ParseResponseAsync(
        HttpResponseMessage response,
        CancellationToken cancellationToken)
    {
        response.EnsureSuccessStatusCode();
        if (response.Content.Headers.ContentLength is > MaximumResponseBytes)
            throw new InvalidOperationException("La risposta della fonte supera il limite consentito.");

        await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
        using var buffer = new MemoryStream();
        var chunk = new byte[81920];
        int read;
        while ((read = await stream.ReadAsync(chunk.AsMemory(0, chunk.Length), cancellationToken)) > 0)
        {
            if (buffer.Length + read > MaximumResponseBytes)
                throw new InvalidOperationException("La risposta della fonte supera il limite consentito.");
            await buffer.WriteAsync(chunk.AsMemory(0, read), cancellationToken);
        }
        buffer.Position = 0;
        return await JsonDocument.ParseAsync(
            buffer, new JsonDocumentOptions { MaxDepth = 64 }, cancellationToken);
    }

    internal static IReadOnlyList<JobPostingRecord> ParseLever(JsonElement root, string companyName)
    {
        if (root.ValueKind != JsonValueKind.Array) return [];
        var results = new List<JobPostingRecord>();
        foreach (var item in root.EnumerateArray())
        {
            var id = Text(item, "id");
            var title = Text(item, "text");
            if (id.Length == 0 || title.Length == 0) continue;

            var description = Text(item, "descriptionPlain");
            results.Add(new JobPostingRecord(
                id, title, companyName, NestedText(item, "categories", "location"),
                NormalizeWorkMode(Text(item, "workplaceType")),
                LeverSalary(item, description), Limit(description, MaximumDescriptionLength),
                SafeHttpUrl(Text(item, "hostedUrl")), SafeHttpUrl(Text(item, "applyUrl")), null, null));
        }
        return results;
    }

    private static string LeverSalary(JsonElement item, string description)
    {
        if (item.TryGetProperty("salaryRange", out var range) && range.ValueKind == JsonValueKind.Object)
        {
            var minimum = Text(range, "min");
            var maximum = Text(range, "max");
            var currency = Text(range, "currency");
            var interval = Text(range, "interval");
            if (minimum.Length > 0 || maximum.Length > 0)
            {
                var values = minimum.Length > 0 && maximum.Length > 0
                    ? minimum + " - " + maximum
                    : minimum + maximum;
                return string.Join(" ", new[] { values, currency, interval }.Where(x => x.Length > 0));
            }
        }

        var salaryDescription = Text(item, "salaryDescriptionPlain");
        return salaryDescription.Length > 0 ? Limit(salaryDescription, 180) : ExtractSalary(description);
    }

    internal static IReadOnlyList<JobPostingRecord> ParseGreenhouse(JsonElement root, string companyName)
    {
        if (!root.TryGetProperty("jobs", out var jobs) || jobs.ValueKind != JsonValueKind.Array) return [];
        var results = new List<JobPostingRecord>();
        foreach (var item in jobs.EnumerateArray())
        {
            var id = Text(item, "id");
            var title = Text(item, "title");
            if (id.Length == 0 || title.Length == 0) continue;

            var content = PlainText(Text(item, "content"));
            DateTimeOffset? publishedAt = DateTimeOffset.TryParse(Text(item, "first_published"), CultureInfo.InvariantCulture,
                DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal, out var published) ? published : null;
            DateTimeOffset? updatedAt = DateTimeOffset.TryParse(Text(item, "updated_at"), CultureInfo.InvariantCulture,
                DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal, out var updated) ? updated : null;
            results.Add(new JobPostingRecord(
                id, title, companyName, NestedText(item, "location", "name"),
                DetectWorkMode(title + " " + content), ExtractSalary(content),
                Limit(content, MaximumDescriptionLength), SafeHttpUrl(Text(item, "absolute_url")),
                SafeHttpUrl(Text(item, "absolute_url")), publishedAt, updatedAt));
        }
        return results;
    }

    private static string Text(JsonElement element, string property) =>
        element.ValueKind == JsonValueKind.Object && element.TryGetProperty(property, out var value)
            ? value.ValueKind == JsonValueKind.String ? value.GetString() ?? string.Empty : value.ToString()
            : string.Empty;

    private static string NestedText(JsonElement element, string parent, string property) =>
        element.ValueKind == JsonValueKind.Object && element.TryGetProperty(parent, out var nested)
            ? Text(nested, property)
            : string.Empty;

    private static DateTimeOffset? UnixDate(JsonElement element, string property)
    {
        if (!long.TryParse(Text(element, property), NumberStyles.Integer, CultureInfo.InvariantCulture, out var seconds))
            return null;
        try { return DateTimeOffset.FromUnixTimeSeconds(seconds); }
        catch (ArgumentOutOfRangeException) { return null; }
    }

    private static string DecimalText(JsonElement element, string property)
    {
        if (!element.TryGetProperty(property, out var value) || !value.TryGetDecimal(out var number) || number <= 0)
            return string.Empty;
        return number.ToString("N0", CultureInfo.GetCultureInfo("it-IT"));
    }

    private static string SalaryRange(string minimum, string maximum)
    {
        if (minimum.Length == 0 && maximum.Length == 0) return string.Empty;
        var range = minimum.Length > 0 && maximum.Length > 0
            ? minimum + " - " + maximum
            : minimum + maximum;
        return range + " €";
    }

    private static string PlainText(string value) =>
        Regex.Replace(WebUtility.HtmlDecode(value), "<[^>]+>", " ").Trim();

    private static string NormalizeWorkMode(string value) => value.Trim().ToLowerInvariant() switch
    {
        "remote" or "fully remote" => "Remote",
        "hybrid" => "Hybrid",
        "on-site" or "on site" or "onsite" => "OnSite",
        _ => DetectWorkMode(value)
    };

    private static string DetectWorkMode(string value)
    {
        var normalized = value.ToLowerInvariant();
        if (Regex.IsMatch(normalized, @"\b(remote|fully remote|100% remoto|lavoro da remoto)\b"))
            return "Remote";
        if (Regex.IsMatch(normalized, @"\b(hybrid|ibrido|smart working)\b"))
            return "Hybrid";
        if (Regex.IsMatch(normalized, @"\b(on-site|onsite|in sede|presenza)\b"))
            return "OnSite";
        return string.Empty;
    }

    private static string SafeHttpUrl(string value) =>
        Uri.TryCreate(value, UriKind.Absolute, out var uri) &&
        (uri.Scheme == Uri.UriSchemeHttps || uri.Scheme == Uri.UriSchemeHttp)
            ? uri.ToString()
            : string.Empty;

    private static string Limit(string value, int length) =>
        value.Length <= length ? value.Trim() : value[..length].Trim();

    private static string ExtractSalary(string description)
    {
        var match = Regex.Match(description, @"(?:RAL|retribuzione|salary|compensation)[^0-9€]{0,35}(?:€\s*)?([\d.,]{4,})",
            RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);
        return match.Success ? match.Value.Trim() : string.Empty;
    }
}
