using System.Globalization;
using System.Net;
using System.Text.Json;
using System.Text.RegularExpressions;
using JobHunter.Api.Domain;

namespace JobHunter.Api.Infrastructure.JobDiscovery;

public interface IJobBoardClient
{
    Task<IReadOnlyList<JobPostingRecord>> FetchAsync(JobSource source, CancellationToken cancellationToken);
}

public sealed record JobPostingRecord(
    string ExternalId,
    string Title,
    string Location,
    string WorkMode,
    string SalaryText,
    string Description,
    string SourceUrl,
    string ApplyUrl,
    DateTimeOffset? PublishedAt,
    DateTimeOffset? SourceUpdatedAt);

/// <summary>
/// Reads public job listings only from the documented, fixed HTTPS endpoints of Lever and Greenhouse.
/// The user can supply a board identifier, never an arbitrary URL.
/// </summary>
public sealed class JobBoardClient(HttpClient httpClient) : IJobBoardClient
{
    private const int MaximumDescriptionLength = 8000;

    public async Task<IReadOnlyList<JobPostingRecord>> FetchAsync(JobSource source, CancellationToken cancellationToken)
    {
        if (!Regex.IsMatch(source.BoardIdentifier, "^[A-Za-z0-9_-]{1,120}$", RegexOptions.CultureInvariant))
            throw new InvalidOperationException("Identificativo della board non valido.");

        var provider = source.Provider.Trim().ToLowerInvariant();
        var endpoint = provider switch
        {
            "lever" => $"https://api.lever.co/v0/postings/{Uri.EscapeDataString(source.BoardIdentifier)}?mode=json",
        "lever-eu" => $"https://api.eu.lever.co/v0/postings/{Uri.EscapeDataString(source.BoardIdentifier)}?mode=json",
            "greenhouse" => $"https://boards-api.greenhouse.io/v1/boards/{Uri.EscapeDataString(source.BoardIdentifier)}/jobs?content=true",
            _ => throw new InvalidOperationException("Provider non supportato.")
        };

        using var response = await httpClient.GetAsync(endpoint, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
        response.EnsureSuccessStatusCode();
        if (response.Content.Headers.ContentLength is > 5_000_000)
            throw new InvalidOperationException("La risposta della fonte supera il limite consentito.");

        await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
        using var buffer = new MemoryStream();
        var chunk = new byte[81920];
        int read;
        while ((read = await stream.ReadAsync(chunk, cancellationToken)) > 0)
        {
            if (buffer.Length + read > 5_000_000)
                throw new InvalidOperationException("La risposta della fonte supera il limite consentito.");
            await buffer.WriteAsync(chunk.AsMemory(0, read), cancellationToken);
        }
        buffer.Position = 0;
        using var document = await JsonDocument.ParseAsync(buffer, new JsonDocumentOptions { MaxDepth = 64 }, cancellationToken);
        return provider is "lever" or "lever-eu"
            ? ParseLever(document.RootElement)
            : ParseGreenhouse(document.RootElement);
    }

    internal static IReadOnlyList<JobPostingRecord> ParseLever(JsonElement root)
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
                id, title, NestedText(item, "categories", "location"), NormalizeWorkMode(Text(item, "workplaceType")),
                LeverSalary(item, description), Limit(description, MaximumDescriptionLength),
                SafeHttpsUrl(Text(item, "hostedUrl")), SafeHttpsUrl(Text(item, "applyUrl")),
                null,
                null));
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

    internal static IReadOnlyList<JobPostingRecord> ParseGreenhouse(JsonElement root)
    {
        if (!root.TryGetProperty("jobs", out var jobs) || jobs.ValueKind != JsonValueKind.Array) return [];
        var results = new List<JobPostingRecord>();
        foreach (var item in jobs.EnumerateArray())
        {
            var id = Text(item, "id");
            var title = Text(item, "title");
            if (id.Length == 0 || title.Length == 0) continue;

            var content = WebUtility.HtmlDecode(Regex.Replace(Text(item, "content"), "<[^>]+>", " "));
            DateTimeOffset? publishedAt = DateTimeOffset.TryParse(Text(item, "first_published"), CultureInfo.InvariantCulture,
                DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal, out var published) ? published : null;
            DateTimeOffset? updatedAt = DateTimeOffset.TryParse(Text(item, "updated_at"), CultureInfo.InvariantCulture,
                DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal, out var updated) ? updated : null;
            results.Add(new JobPostingRecord(
                id, title, NestedText(item, "location", "name"), string.Empty, ExtractSalary(content),
                Limit(content, MaximumDescriptionLength), SafeHttpsUrl(Text(item, "absolute_url")),
                SafeHttpsUrl(Text(item, "absolute_url")), publishedAt, updatedAt));
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

    private static string NormalizeWorkMode(string value) => value.Trim().ToLowerInvariant() switch
    {
        "remote" or "fully remote" => "Remote",
        "hybrid" => "Hybrid",
        "on-site" or "on site" or "onsite" => "OnSite",
        _ => string.Empty
    };

    private static string SafeHttpsUrl(string value) =>
        Uri.TryCreate(value, UriKind.Absolute, out var uri) && uri.Scheme == Uri.UriSchemeHttps ? uri.ToString() : string.Empty;

    private static string Limit(string value, int length) => value.Length <= length ? value.Trim() : value[..length].Trim();

    private static string ExtractSalary(string description)
    {
        var match = Regex.Match(description, @"(?:RAL|retribuzione|salary|compensation)[^0-9€]{0,35}(?:€\s*)?([\d.,]{4,})",
            RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);
        return match.Success ? match.Value.Trim() : string.Empty;
    }
}
