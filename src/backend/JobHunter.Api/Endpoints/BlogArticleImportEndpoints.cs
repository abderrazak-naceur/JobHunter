using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Text.RegularExpressions;

namespace JobHunter.Api.Endpoints;

public sealed record BlogArticleImportRequest(string Url);
public sealed record BlogArticleImportResponse(string SourceUrl, string SourceTitle, string SourceDescription, string SourceHost, string ExtractedMarkdown);

public static partial class BlogArticleImportEndpoints
{
    public const string RateLimitPolicy = "blog-article-import";
    private const int MaxResponseBytes = 2 * 1024 * 1024;

    public static IEndpointRouteBuilder MapBlogArticleImportEndpoints(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapPost("/api/v1/admin/blog/import-url", async (
            BlogArticleImportRequest request,
            IHttpClientFactory clients,
            CancellationToken ct) =>
        {
            if (!Uri.TryCreate(request.Url, UriKind.Absolute, out var uri) ||
                uri.Scheme != Uri.UriSchemeHttps || uri.Port != 443 || string.IsNullOrWhiteSpace(uri.Host) ||
                !string.IsNullOrEmpty(uri.UserInfo))
                return Results.ValidationProblem(new Dictionary<string, string[]> { ["url"] = ["Inserisci un URL HTTPS pubblico e valido."] });

            if (!await IsPublicHostAsync(uri.Host, ct))
                return Results.BadRequest(new { title = "Host non consentito. Usa un sito pubblico raggiungibile via HTTPS." });

            try
            {
                using var response = await clients.CreateClient("BlogArticleImport").GetAsync(uri, HttpCompletionOption.ResponseHeadersRead, ct);
                if ((int)response.StatusCode is >= 300 and < 400)
                    return Results.BadRequest(new { title = "Il sito reindirizza la richiesta. Inserisci direttamente l'URL finale dell'articolo." });
                if (!response.IsSuccessStatusCode)
                    return Results.Problem(title: "Impossibile leggere l'articolo dal sito indicato.", statusCode: 502);
                if (response.Content.Headers.ContentLength is > MaxResponseBytes)
                    return Results.BadRequest(new { title = "La pagina supera il limite di importazione di 2 MB." });
                var mediaType = response.Content.Headers.ContentType?.MediaType;
                if (mediaType is not null && mediaType != "text/html" && mediaType != "application/xhtml+xml")
                    return Results.BadRequest(new { title = "L'URL non punta a una pagina HTML." });

                await using var stream = await response.Content.ReadAsStreamAsync(ct);
                using var memory = new MemoryStream();
                var buffer = new byte[8192];
                int read;
                while ((read = await stream.ReadAsync(buffer, ct)) > 0)
                {
                    if (memory.Length + read > MaxResponseBytes)
                        return Results.BadRequest(new { title = "La pagina supera il limite di importazione di 2 MB." });
                    memory.Write(buffer, 0, read);
                }

                var html = Encoding.UTF8.GetString(memory.ToArray());
                var title = ExtractMeta(html, "og:title") ?? MatchFirst(html, @"<title[^>]*>(.*?)</title>");
                var description = ExtractMeta(html, "og:description") ?? ExtractMeta(html, "description") ?? "";
                var markdown = ToMarkdown(html);
                if (markdown.Length < 80)
                    return Results.BadRequest(new { title = "Non è stato possibile estrarre contenuto leggibile da questa pagina." });

                return Results.Ok(new BlogArticleImportResponse(uri.ToString(), Clean(title ?? uri.Host), Clean(description), uri.Host, markdown[..Math.Min(markdown.Length, 30000)]));
            }
            catch (OperationCanceledException) when (!ct.IsCancellationRequested)
            {
                return Results.Problem(title: "Timeout durante la lettura dell'articolo.", statusCode: 504);
            }
            catch (HttpRequestException)
            {
                return Results.Problem(title: "Il sito non è raggiungibile o ha rifiutato la richiesta.", statusCode: 502);
            }
        })
        .RequireAuthorization()
        .RequireRateLimiting(RateLimitPolicy)
        .WithTags("Blog Admin");

        return endpoints;
    }

    private static async Task<bool> IsPublicHostAsync(string host, CancellationToken ct)
    {
        if (IPAddress.TryParse(host, out var literal))
            return IsPublicAddress(literal);
        try
        {
            var addresses = await Dns.GetHostAddressesAsync(host, ct);
            return addresses.Length > 0 && addresses.All(IsPublicAddress);
        }
        catch (SocketException) { return false; }
    }

    private static bool IsPublicAddress(IPAddress address)
    {
        if (IPAddress.IsLoopback(address) || address.IsIPv6LinkLocal || address.IsIPv6SiteLocal ||
            address.IsIPv6Multicast || address.Equals(IPAddress.Any) || address.Equals(IPAddress.IPv6Any))
            return false;
        if (address.IsIPv4MappedToIPv6) address = address.MapToIPv4();
        if (address.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork)
        {
            var b = address.GetAddressBytes();
            return !(b[0] == 10 || b[0] == 127 || b[0] == 0 || b[0] == 169 && b[1] == 254 ||
                     b[0] == 172 && b[1] >= 16 && b[1] <= 31 || b[0] == 192 && b[1] == 168 ||
                     b[0] >= 224);
        }
        return address.AddressFamily == System.Net.Sockets.AddressFamily.InterNetworkV6 &&
               !address.IsIPv6UniqueLocal && !address.IsIPv6SiteLocal && !address.IsIPv6LinkLocal && !address.IsIPv6Multicast;
    }

    private static string? ExtractMeta(string html, string key)
    {
        var pattern = $@"<meta[^>]+(?:property|name)=[""']{Regex.Escape(key)}[""'][^>]+content=[""'](.*?)[""']";
        return MatchFirst(html, pattern);
    }

    private static string? MatchFirst(string html, string pattern)
    {
        var match = Regex.Match(html, pattern, RegexOptions.IgnoreCase | RegexOptions.Singleline);
        return match.Success ? Clean(match.Groups[1].Value) : null;
    }

    private static string ToMarkdown(string html)
    {
        var content = Regex.Replace(html, @"<(script|style|nav|footer|header|noscript|svg)[^>]*>.*?</\\1>", " ", RegexOptions.IgnoreCase | RegexOptions.Singleline);
        content = Regex.Replace(content, @"<!--.*?-->", " ", RegexOptions.Singleline);
        content = Regex.Replace(content, @"<pre[^>]*>(.*?)</pre>", m => "\\n\\n```\\n" + StripTags(m.Groups[1].Value) + "\\n```\\n", RegexOptions.IgnoreCase | RegexOptions.Singleline);
        content = Regex.Replace(content, @"<blockquote[^>]*>(.*?)</blockquote>", m => "\\n> " + StripTags(m.Groups[1].Value) + "\\n", RegexOptions.IgnoreCase | RegexOptions.Singleline);
        content = Regex.Replace(content, @"<h1[^>]*>(.*?)</h1>", m => "\\n# " + StripTags(m.Groups[1].Value) + "\\n", RegexOptions.IgnoreCase | RegexOptions.Singleline);
        content = Regex.Replace(content, @"<h2[^>]*>(.*?)</h2>", m => "\\n## " + StripTags(m.Groups[1].Value) + "\\n", RegexOptions.IgnoreCase | RegexOptions.Singleline);
        content = Regex.Replace(content, @"<h3[^>]*>(.*?)</h3>", m => "\\n### " + StripTags(m.Groups[1].Value) + "\\n", RegexOptions.IgnoreCase | RegexOptions.Singleline);
        content = Regex.Replace(content, @"<li[^>]*>(.*?)</li>", m => "\\n- " + StripTags(m.Groups[1].Value), RegexOptions.IgnoreCase | RegexOptions.Singleline);
        content = Regex.Replace(content, @"<br\\s*/?>", "\\n", RegexOptions.IgnoreCase);
        content = Regex.Replace(content, @"</(p|div|section|article|ul|ol|main)[^>]*>", "\\n\\n", RegexOptions.IgnoreCase);
        content = StripTags(content);
        var decoded = WebUtility.HtmlDecode(content).Replace("\\r", "");
        decoded = Regex.Replace(decoded, @"[ \\t]+\\n", "\\n");
        decoded = Regex.Replace(decoded, @"\\n[ \\t]+", "\\n");
        return Regex.Replace(decoded, @"\\n{3,}", "\\n\\n").Trim();
    }

    private static string StripTags(string value) => Regex.Replace(value, "<[^>]+>", " ");
    private static string Clean(string? value) => Regex.Replace(WebUtility.HtmlDecode(value ?? ""), @"\s+", " ").Trim();
}
