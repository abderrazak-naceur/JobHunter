using System.Net;
using System.Net.Sockets;
using System.Text;

namespace JobHunter.Api.Infrastructure.JobPostings;

/// <summary>Why a page could not be read, in words the owner understands.</summary>
public sealed class JobPageException(string message) : Exception(message);

/// <summary>Downloads the HTML of a job posting. Replaced by a fake in the tests.</summary>
public interface IJobPageFetcher
{
    Task<string> FetchHtmlAsync(Uri url, CancellationToken cancellationToken);
}

/// <summary>
/// Opens a public web page on behalf of the signed-in owner, with the guards a server needs when it follows a
/// link it was given (SSRF): only ports 80/443, only public addresses - checked on every connection, so a
/// redirect or a DNS name pointing inside the network is refused too - a short timeout and a size cap.
/// </summary>
public sealed class JobPageFetcher : IJobPageFetcher, IDisposable
{
    public const int MaxBytes = 2 * 1024 * 1024;
    private static readonly TimeSpan Timeout = TimeSpan.FromSeconds(10);

    private readonly HttpClient _client;

    public JobPageFetcher()
    {
        var handler = new SocketsHttpHandler
        {
            AllowAutoRedirect = true,
            MaxAutomaticRedirections = 5,
            AutomaticDecompression = DecompressionMethods.All,
            ConnectTimeout = TimeSpan.FromSeconds(5),
            UseProxy = false,
            ConnectCallback = ConnectToPublicAddressAsync
        };
        _client = new HttpClient(handler) { Timeout = Timeout };
        _client.DefaultRequestHeaders.UserAgent.ParseAdd("Mozilla/5.0 (compatible; PortfolioJobReader/1.0; personal job tracker)");
        _client.DefaultRequestHeaders.Accept.ParseAdd("text/html,application/xhtml+xml;q=0.9,*/*;q=0.5");
        _client.DefaultRequestHeaders.AcceptLanguage.ParseAdd("it-IT,it;q=0.9,en;q=0.8");
    }

    public async Task<string> FetchHtmlAsync(Uri url, CancellationToken cancellationToken)
    {
        HttpResponseMessage response;
        try
        {
            response = await _client.GetAsync(url, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
        }
        catch (HttpRequestException exception) when (exception.InnerException is JobPageException blocked)
        {
            throw blocked;
        }
        catch (HttpRequestException)
        {
            throw new JobPageException("Il sito non risponde o l'indirizzo non esiste.");
        }
        catch (TaskCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            throw new JobPageException("Il sito ci mette troppo a rispondere.");
        }

        using (response)
        {
            if (response.StatusCode is HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden)
                throw new JobPageException("Il sito non permette di leggere l'annuncio senza accesso: copia il testo dell'annuncio nel riquadro.");
            if (response.StatusCode == HttpStatusCode.NotFound)
                throw new JobPageException("L'annuncio non esiste più o l'indirizzo è sbagliato.");
            if (!response.IsSuccessStatusCode)
                throw new JobPageException($"Il sito ha risposto con un errore (HTTP {(int)response.StatusCode}).");

            var mediaType = response.Content.Headers.ContentType?.MediaType ?? "";
            if (mediaType.Length > 0 && !mediaType.Contains("html", StringComparison.OrdinalIgnoreCase))
                throw new JobPageException("Il link non porta a una pagina web (ad esempio è un PDF): copia il testo dell'annuncio nel riquadro.");
            if (response.Content.Headers.ContentLength > MaxBytes)
                throw new JobPageException("La pagina è troppo grande da leggere.");

            await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
            var bytes = await ReadLimitedAsync(stream, cancellationToken);
            var charset = response.Content.Headers.ContentType?.CharSet?.Trim('"');
            return DecodeText(bytes, charset);
        }
    }

    private static async Task<byte[]> ReadLimitedAsync(Stream stream, CancellationToken cancellationToken)
    {
        using var buffer = new MemoryStream();
        var chunk = new byte[81920];
        int read;
        while ((read = await stream.ReadAsync(chunk, cancellationToken)) > 0)
        {
            if (buffer.Length + read > MaxBytes) throw new JobPageException("La pagina è troppo grande da leggere.");
            buffer.Write(chunk, 0, read);
        }

        return buffer.ToArray();
    }

    private static string DecodeText(byte[] bytes, string? charset)
    {
        try
        {
            if (!string.IsNullOrWhiteSpace(charset)) return Encoding.GetEncoding(charset).GetString(bytes);
        }
        catch (ArgumentException)
        {
            // Unknown charset name: UTF-8 is by far the most common on job sites.
        }

        return Encoding.UTF8.GetString(bytes);
    }

    /// <summary>Resolves the host and connects only to a public address on port 80 or 443.</summary>
    private static async ValueTask<Stream> ConnectToPublicAddressAsync(SocketsHttpConnectionContext context, CancellationToken cancellationToken)
    {
        var endpoint = context.DnsEndPoint;
        if (endpoint.Port is not (80 or 443))
            throw new JobPageException("Sono ammessi solo indirizzi web standard (porte 80 e 443).");

        var addresses = IPAddress.TryParse(endpoint.Host, out var literal)
            ? [literal]
            : await Dns.GetHostAddressesAsync(endpoint.Host, cancellationToken);
        // Every address must be public: a name that also points inside the network is refused as a whole.
        if (addresses.Length == 0 || !addresses.All(IsPublicAddress))
            throw new JobPageException("L'indirizzo punta a una rete privata o locale e non può essere letto.");

        var socket = new Socket(SocketType.Stream, ProtocolType.Tcp) { NoDelay = true };
        try
        {
            // Connect to the addresses that were checked, never re-resolving the name.
            await socket.ConnectAsync(addresses, endpoint.Port, cancellationToken);
            return new NetworkStream(socket, ownsSocket: true);
        }
        catch
        {
            socket.Dispose();
            throw;
        }
    }

    /// <summary>False for loopback, private, link-local, carrier-grade NAT, multicast and other non-internet ranges.</summary>
    public static bool IsPublicAddress(IPAddress address)
    {
        if (address.IsIPv4MappedToIPv6) address = address.MapToIPv4();

        if (address.AddressFamily == AddressFamily.InterNetwork)
        {
            var b = address.GetAddressBytes();
            return !(b[0] == 0 ||                                  // "this" network
                     b[0] == 10 ||                                 // private
                     b[0] == 127 ||                                // loopback
                     b[0] == 100 && b[1] >= 64 && b[1] <= 127 ||   // carrier-grade NAT
                     b[0] == 169 && b[1] == 254 ||                 // link-local, cloud metadata
                     b[0] == 172 && b[1] >= 16 && b[1] <= 31 ||    // private
                     b[0] == 192 && b[1] == 0 && b[2] == 0 ||      // IETF protocol assignments
                     b[0] == 192 && b[1] == 168 ||                 // private
                     b[0] == 198 && (b[1] == 18 || b[1] == 19) ||  // benchmarking
                     b[0] >= 224);                                 // multicast and reserved
        }

        if (address.AddressFamily == AddressFamily.InterNetworkV6)
        {
            if (IPAddress.IsLoopback(address) || address.Equals(IPAddress.IPv6None) || address.Equals(IPAddress.IPv6Any)) return false;
            if (address.IsIPv6LinkLocal || address.IsIPv6SiteLocal || address.IsIPv6Multicast) return false;
            var first = address.GetAddressBytes()[0];
            return (first & 0xFE) != 0xFC; // fc00::/7 unique local
        }

        return false;
    }

    public void Dispose() => _client.Dispose();
}
