using System.Globalization;
using System.Net;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace JobHunter.Api.Infrastructure.JobPostings;

/// <summary>What could be read from a job posting. Empty strings mean "not found".</summary>
public sealed record JobPostingDraft(
    string Company,
    string Role,
    string Location,
    string SalaryRange,
    string Source,
    string Url,
    string Notes)
{
    public static readonly JobPostingDraft Empty = new("", "", "", "", "", "", "");
}

/// <summary>
/// Reads the useful fields of a job posting. Pages are read through the schema.org <c>JobPosting</c> data that job
/// sites publish for search engines, falling back to the page title; pasted text is read with simple rules.
/// Nothing here touches the network.
/// </summary>
public static partial class JobPostingParser
{
    // Same limits as the application fields, so a draft can always be saved as it is.
    private const int MaxCompany = 180, MaxRole = 180, MaxLocation = 180, MaxSalary = 120, MaxSource = 120, MaxNotes = 4000;

    private static readonly CultureInfo Italian = CultureInfo.GetCultureInfo("it-IT");

    // ------------------------------------------------------------------ pages

    public static JobPostingDraft ParseHtml(string html, Uri url)
    {
        var source = SourceFor(url);
        var posting = FindJobPosting(html);
        if (posting is { } job)
        {
            var notes = new List<string>();
            if (DateText(job, "validThrough") is { } deadline) notes.Add($"Scadenza annuncio: {deadline}");
            if (EmploymentType(job) is { Length: > 0 } employment) notes.Add($"Tipo di contratto: {employment}");

            var company = Text(job, "hiringOrganization", "name") ?? Text(job, "hiringOrganization") ?? "";
            return Clean(new JobPostingDraft(
                company,
                Text(job, "title") ?? "",
                Location(job),
                Salary(job, "baseSalary") ?? Salary(job, "estimatedSalary") ?? "",
                source,
                url.ToString(),
                string.Join(" · ", notes)));
        }

        // No structured data: the page title is usually "Role - Company" or just the role.
        var title = Meta(html, "og:title") ?? TitleTag(html) ?? "";
        var siteName = Meta(html, "og:site_name") ?? "";
        var (role, companyFromTitle) = SplitTitle(title, siteName);
        var companyFallback = companyFromTitle.Length > 0 ? companyFromTitle : (source == CompanySite ? siteName : "");
        return Clean(new JobPostingDraft(companyFallback, role, "", "", source, url.ToString(), ""));
    }

    /// <summary>Finds the first schema.org JobPosting in the JSON-LD blocks of the page, also inside @graph and arrays.</summary>
    private static JsonElement? FindJobPosting(string html)
    {
        foreach (Match block in JsonLdBlock().Matches(html))
        {
            // Read as it is first; a few sites HTML-encode the whole block, so that is the second try.
            var raw = block.Groups[1].Value.Trim();
            if ((TryRead(raw) ?? TryRead(WebUtility.HtmlDecode(raw))) is { } found) return found;
        }

        return null;

        static JsonElement? TryRead(string json)
        {
            try
            {
                using var document = JsonDocument.Parse(json,
                    new JsonDocumentOptions { AllowTrailingCommas = true, CommentHandling = JsonCommentHandling.Skip });
                return Search(document.RootElement)?.Clone();
            }
            catch (JsonException)
            {
                return null; // a broken block is skipped; another one on the page may be fine
            }
        }

        static JsonElement? Search(JsonElement element)
        {
            if (element.ValueKind == JsonValueKind.Array)
            {
                foreach (var item in element.EnumerateArray())
                    if (Search(item) is { } found) return found;
                return null;
            }

            if (element.ValueKind != JsonValueKind.Object) return null;
            if (IsJobPosting(element)) return element;
            return element.TryGetProperty("@graph", out var graph) ? Search(graph) : null;
        }

        static bool IsJobPosting(JsonElement element) =>
            element.TryGetProperty("@type", out var type) &&
            (type.ValueKind == JsonValueKind.String && type.GetString() == "JobPosting" ||
             type.ValueKind == JsonValueKind.Array && type.EnumerateArray().Any(t => t.ValueKind == JsonValueKind.String && t.GetString() == "JobPosting"));
    }

    private static string Location(JsonElement job)
    {
        var places = new List<string>();
        if (job.TryGetProperty("jobLocation", out var locations))
        {
            foreach (var place in locations.ValueKind == JsonValueKind.Array ? locations.EnumerateArray().ToList() : [locations])
            {
                var text = place.ValueKind == JsonValueKind.String ? place.GetString() : AddressText(place);
                if (!string.IsNullOrWhiteSpace(text) && !places.Contains(text)) places.Add(text);
            }
        }

        var remote = Text(job, "jobLocationType") is { } type && type.Contains("TELECOMMUTE", StringComparison.OrdinalIgnoreCase);
        var location = string.Join(" / ", places);
        if (remote) location = location.Length == 0 ? "Remoto" : $"{location} (anche da remoto)";
        return location;

        static string? AddressText(JsonElement place)
        {
            var address = place.TryGetProperty("address", out var a) ? a : place;
            if (address.ValueKind == JsonValueKind.String) return address.GetString();
            if (address.ValueKind != JsonValueKind.Object) return null;
            var parts = new[] { "addressLocality", "addressRegion", "addressCountry" }
                .Select(key => address.TryGetProperty(key, out var value)
                    ? value.ValueKind == JsonValueKind.Object ? Text(value, "name") : value.ValueKind == JsonValueKind.String ? value.GetString() : null
                    : null)
                .Where(part => !string.IsNullOrWhiteSpace(part))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();
            return parts.Count == 0 ? null : string.Join(", ", parts);
        }
    }

    /// <summary>"45.000–55.000 € / anno" from a schema.org MonetaryAmount; null when there is no amount.</summary>
    private static string? Salary(JsonElement job, string property)
    {
        if (!job.TryGetProperty(property, out var salary)) return null;
        if (salary.ValueKind == JsonValueKind.Array) salary = salary.EnumerateArray().FirstOrDefault();
        if (salary.ValueKind == JsonValueKind.Number) return Amount(salary.GetDecimal(), "EUR");
        if (salary.ValueKind != JsonValueKind.Object) return null;

        var currency = Text(salary, "currency") ?? "EUR";
        var value = salary.TryGetProperty("value", out var v) ? v : salary;
        decimal? min = Number(value, "minValue"), max = Number(value, "maxValue"), single = Number(value, "value");
        if (value.ValueKind == JsonValueKind.Number) single = value.GetDecimal();

        var unit = (Text(value, "unitText") ?? Text(salary, "unitText") ?? "").ToUpperInvariant() switch
        {
            "YEAR" => " / anno",
            "MONTH" => " / mese",
            "WEEK" => " / settimana",
            "DAY" => " / giorno",
            "HOUR" => " / ora",
            _ => ""
        };

        string? amount = min is not null && max is not null && min != max ? $"{Amount(min.Value, currency)}–{Amount(max.Value, currency)}"
            : (min ?? max ?? single) is { } one ? Amount(one, currency)
            : null;
        return amount is null ? null : amount + unit;

        static decimal? Number(JsonElement element, string key)
        {
            if (element.ValueKind != JsonValueKind.Object || !element.TryGetProperty(key, out var value)) return null;
            if (value.ValueKind == JsonValueKind.Number) return value.GetDecimal();
            return value.ValueKind == JsonValueKind.String && decimal.TryParse(value.GetString(), NumberStyles.Number, CultureInfo.InvariantCulture, out var parsed) ? parsed : null;
        }

        static string Amount(decimal value, string currency)
        {
            var number = value.ToString(value == Math.Floor(value) ? "#,0" : "#,0.##", Italian);
            return currency.Equals("EUR", StringComparison.OrdinalIgnoreCase) ? $"{number} €" : $"{number} {currency.ToUpperInvariant()}";
        }
    }

    private static string EmploymentType(JsonElement job)
    {
        if (!job.TryGetProperty("employmentType", out var type)) return "";
        var values = type.ValueKind == JsonValueKind.Array
            ? type.EnumerateArray().Where(t => t.ValueKind == JsonValueKind.String).Select(t => t.GetString()!).ToList()
            : type.ValueKind == JsonValueKind.String ? [type.GetString()!] : [];
        return string.Join(", ", values.Select(value => value.ToUpperInvariant() switch
        {
            "FULL_TIME" => "Full time",
            "PART_TIME" => "Part time",
            "CONTRACTOR" => "Collaborazione / partita IVA",
            "TEMPORARY" => "Tempo determinato",
            "INTERN" => "Stage",
            "PERMANENT" => "Tempo indeterminato",
            _ => value
        }));
    }

    private static string? DateText(JsonElement job, string key) =>
        Text(job, key) is { } raw && DateTimeOffset.TryParse(raw, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out var date)
            ? date.ToString("dd/MM/yyyy", CultureInfo.InvariantCulture)
            : null;

    /// <summary>A text value at a path; for objects without the next key, their "name" is used.</summary>
    private static string? Text(JsonElement element, params string[] path)
    {
        foreach (var key in path)
        {
            if (element.ValueKind == JsonValueKind.Array) element = element.EnumerateArray().FirstOrDefault();
            if (element.ValueKind != JsonValueKind.Object || !element.TryGetProperty(key, out element)) return null;
        }

        if (element.ValueKind == JsonValueKind.Array) element = element.EnumerateArray().FirstOrDefault();
        return element.ValueKind switch
        {
            JsonValueKind.String => element.GetString(),
            JsonValueKind.Object when element.TryGetProperty("name", out var name) && name.ValueKind == JsonValueKind.String => name.GetString(),
            _ => null
        };
    }

    private static string? Meta(string html, string property)
    {
        foreach (Match tag in MetaTag().Matches(html))
        {
            var attributes = tag.Value;
            var key = AttributeValue(attributes, "property") ?? AttributeValue(attributes, "name");
            if (string.Equals(key, property, StringComparison.OrdinalIgnoreCase))
                return AttributeValue(attributes, "content") is { Length: > 0 } content ? WebUtility.HtmlDecode(content) : null;
        }

        return null;

        static string? AttributeValue(string tag, string name)
        {
            var match = Regex.Match(tag, $@"\b{name}\s*=\s*(?:""([^""]*)""|'([^']*)')", RegexOptions.IgnoreCase, TimeSpan.FromSeconds(1));
            return match.Success ? (match.Groups[1].Success ? match.Groups[1].Value : match.Groups[2].Value) : null;
        }
    }

    private static string? TitleTag(string html)
    {
        var match = TitleElement().Match(html);
        return match.Success ? WebUtility.HtmlDecode(match.Groups[1].Value) : null;
    }

    /// <summary>"Senior Dev - Acme | Careers" → ("Senior Dev", "Acme"); the site name is not taken as the company.</summary>
    private static (string Role, string Company) SplitTitle(string title, string siteName)
    {
        var parts = TitleSeparator().Split(title).Select(part => part.Trim()).Where(part => part.Length > 0).ToList();
        parts.RemoveAll(part => part.Equals(siteName, StringComparison.OrdinalIgnoreCase) || GenericTitleWords().IsMatch(part));
        if (parts.Count == 0) return ("", "");
        var company = parts.Count > 1 ? AtCompany().Replace(parts[1], "") : "";
        return (AtCompany().Replace(parts[0], ""), company);
    }

    // ------------------------------------------------------------------ pasted text

    /// <summary>
    /// Reads text copied from a posting. Works best with the usual layout: the role on the first line and
    /// "Company · Place · ..." on the second (LinkedIn), or labelled lines such as "Sede: Milano".
    /// </summary>
    public static JobPostingDraft ParseText(string text, Uri? url)
    {
        var lines = text.Replace("\r", "").Split('\n')
            .Select(line => WhiteSpace().Replace(line, " ").Trim())
            .Where(line => line.Length > 0)
            .ToList();

        string Labelled(params string[] labels)
        {
            foreach (var line in lines)
            {
                var match = Regex.Match(line, $@"^(?:{string.Join("|", labels)})\s*[:\-–]\s*(.+)$", RegexOptions.IgnoreCase, TimeSpan.FromSeconds(1));
                if (match.Success) return match.Groups[1].Value.Trim();
            }

            return "";
        }

        var role = Labelled("ruolo", "posizione", "job title", "titolo", "position", "role");
        var company = Labelled("azienda", "società", "company", "datore di lavoro", "employer");
        var location = Labelled("sede", "sede di lavoro", "località", "luogo di lavoro", "location", "luogo");
        var salary = Labelled("retribuzione", "ral", "stipendio", "compenso", "salary", "salario");

        // Unlabelled layout: role first, then "Company · Place · posted 2 days ago".
        if (role.Length == 0 && lines.Count > 0 && lines[0].Length <= MaxRole && !lines[0].Contains(':')) role = lines[0];
        var details = lines.Skip(1).Take(3).FirstOrDefault(line => line.Contains('·') || line.Contains(" | "));
        if (details is not null)
        {
            var parts = details.Split(['·', '|'], StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries)
                .Where(part => !PostedAgo().IsMatch(part))
                .ToList();
            if (company.Length == 0 && parts.Count > 0) company = parts[0];
            if (location.Length == 0 && parts.Count > 1) location = parts[1];
        }

        if (salary.Length == 0)
        {
            var amountLine = lines.FirstOrDefault(line => SalaryHint().IsMatch(line) && SalaryAmount().IsMatch(line));
            if (amountLine is not null) salary = SalaryAmount().Match(amountLine).Value.Trim();
        }

        var workMode = WorkMode(text);
        if (workMode.Length > 0 && !location.Contains(workMode, StringComparison.OrdinalIgnoreCase))
            location = location.Length == 0 ? workMode : $"{location} ({workMode})";

        return Clean(new JobPostingDraft(company, role, location, salary, url is null ? "" : SourceFor(url), url?.ToString() ?? "", ""));
    }

    private static string WorkMode(string text) =>
        Regex.IsMatch(text, @"\b(ibrid[oa]|hybrid)\b", RegexOptions.IgnoreCase, TimeSpan.FromSeconds(1)) ? "ibrido"
        : Regex.IsMatch(text, @"\b(full[- ]remote|da remoto|remoto|remote)\b", RegexOptions.IgnoreCase, TimeSpan.FromSeconds(1)) ? "remoto"
        : Regex.IsMatch(text, @"\b(in sede|on[- ]site)\b", RegexOptions.IgnoreCase, TimeSpan.FromSeconds(1)) ? "in sede"
        : "";

    // ------------------------------------------------------------------ shared

    public const string CompanySite = "Sito aziendale";

    /// <summary>Job boards by a piece of their host name, so "Fonte" says where the posting came from.</summary>
    private static readonly (string Marker, string Name)[] KnownSites =
    [
        ("linkedin.com", "LinkedIn"), ("lnkd.in", "LinkedIn"), ("indeed.", "Indeed"), ("glassdoor.", "Glassdoor"),
        ("infojobs.", "InfoJobs"), ("monster.", "Monster"), ("greenhouse.io", "Greenhouse"), ("lever.co", "Lever"),
        ("myworkdayjobs.com", "Workday"), ("smartrecruiters.com", "SmartRecruiters"), ("personio.", "Personio"),
        ("teamtailor.com", "Teamtailor"), ("recruitee.com", "Recruitee"), ("workable.com", "Workable")
    ];

    public static string SourceFor(Uri url)
    {
        var host = url.Host.ToLowerInvariant();
        foreach (var (marker, name) in KnownSites)
            if (host.Contains(marker)) return name;
        return CompanySite;
    }

    private static JobPostingDraft Clean(JobPostingDraft draft) => new(
        Fit(draft.Company, MaxCompany),
        Fit(draft.Role, MaxRole),
        Fit(draft.Location, MaxLocation),
        Fit(draft.SalaryRange, MaxSalary),
        Fit(draft.Source, MaxSource),
        draft.Url,
        Fit(draft.Notes, MaxNotes));

    /// <summary>Plain single-line text: tags removed, entities decoded, spaces collapsed, cut to the field limit.</summary>
    private static string Fit(string value, int max)
    {
        var text = WhiteSpace().Replace(WebUtility.HtmlDecode(Tag().Replace(value ?? "", " ")), " ").Trim();
        return text.Length <= max ? text : text[..max].TrimEnd();
    }

    [GeneratedRegex(@"<script[^>]*type\s*=\s*[""']application/ld\+json[""'][^>]*>(.*?)</script>", RegexOptions.IgnoreCase | RegexOptions.Singleline, 2000)]
    private static partial Regex JsonLdBlock();

    [GeneratedRegex(@"<meta\b[^>]*>", RegexOptions.IgnoreCase, 1000)]
    private static partial Regex MetaTag();

    [GeneratedRegex(@"<title[^>]*>(.*?)</title>", RegexOptions.IgnoreCase | RegexOptions.Singleline, 1000)]
    private static partial Regex TitleElement();

    [GeneratedRegex(@"\s+[|\-–—]\s+", RegexOptions.None, 1000)]
    private static partial Regex TitleSeparator();

    [GeneratedRegex(@"^(careers?|jobs?|lavora con noi|offerte di lavoro|carriere|job board|home)$", RegexOptions.IgnoreCase, 1000)]
    private static partial Regex GenericTitleWords();

    [GeneratedRegex(@"^(job application for|candidatura per)\s+|\s+(at|presso)\s+.*$", RegexOptions.IgnoreCase, 1000)]
    private static partial Regex AtCompany();

    [GeneratedRegex(@"\b(\d+\s+(giorn[oi]|settiman[ae]|mes[ei]|or[ae]|days?|weeks?|months?|hours?)\s+(fa|ago)|candidati|applicants?|promoted|promosso|reposted|ripubblicat[oa])\b", RegexOptions.IgnoreCase, 1000)]
    private static partial Regex PostedAgo();

    [GeneratedRegex(@"\b(ral|retribuzione|stipendio|compenso|salary|salario|eur)\b|€|\d\s?k\b", RegexOptions.IgnoreCase, 1000)]
    private static partial Regex SalaryHint();

    // "45.000 - 55.000 €", "€45,000–€55,000", "45k-55k", "40.000 € lordi"
    [GeneratedRegex(@"(?:€\s?)?\d{1,3}(?:[.,]\d{3})+(?:\s?€)?(?:\s?[-–]\s?(?:€\s?)?\d{1,3}(?:[.,]\d{3})+(?:\s?€)?)?|\d{2,3}\s?[kK](?:\s?[-–]\s?\d{2,3}\s?[kK])?(?:\s?€)?", RegexOptions.None, 1000)]
    private static partial Regex SalaryAmount();

    [GeneratedRegex(@"<[^>]+>", RegexOptions.None, 1000)]
    private static partial Regex Tag();

    [GeneratedRegex(@"\s+", RegexOptions.None, 1000)]
    private static partial Regex WhiteSpace();
}
