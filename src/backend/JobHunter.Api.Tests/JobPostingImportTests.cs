using System.Collections.Concurrent;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using JobHunter.Api.Contracts;
using JobHunter.Api.Infrastructure.JobPostings;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;

namespace JobHunter.Api.Tests;

/// <summary>Pages are served by a fake, so the tests never reach the internet.</summary>
public sealed class FakeJobPageFetcher : IJobPageFetcher
{
    public ConcurrentDictionary<string, string> Pages { get; } = new();
    public ConcurrentQueue<Uri> Requested { get; } = new();

    public Task<string> FetchHtmlAsync(Uri url, CancellationToken cancellationToken)
    {
        Requested.Enqueue(url);
        return Pages.TryGetValue(url.ToString(), out var html)
            ? Task.FromResult(html)
            : throw new JobPageException("Il sito non risponde o l'indirizzo non esiste.");
    }
}

public sealed class JobImportApiFactory : JobHunterApiFactory
{
    public FakeJobPageFetcher Fetcher { get; } = new();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        base.ConfigureWebHost(builder);
        builder.ConfigureServices(services => services.AddSingleton<IJobPageFetcher>(Fetcher));
    }
}

public sealed class JobPostingImportTests : IClassFixture<JobImportApiFactory>
{
    private const string Route = "/api/v1/applications/import";
    private readonly JobImportApiFactory _factory;
    private readonly HttpClient _client;

    public JobPostingImportTests(JobImportApiFactory factory)
    {
        _factory = factory;
        _client = factory.CreateAuthenticatedClient();
    }

    [Fact]
    public async Task Import_RequiresAToken()
    {
        var response = await _factory.CreateClient().PostAsJsonAsync(Route, new JobPostingImportRequest("https://example.com/job", null));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task ALink_IsReadIntoADraft_WithoutSavingAnything()
    {
        const string url = "https://careers.acme.it/jobs/7";
        _factory.Fetcher.Pages[url] = """
            <script type="application/ld+json">{ "@type": "JobPosting", "title": "Tech Lead", "hiringOrganization": { "name": "Acme" },
              "jobLocation": { "address": { "addressLocality": "Milano" } } }</script>
            """;

        var response = await _client.PostAsJsonAsync(Route, new JobPostingImportRequest($"  {url}  ", null));
        var draft = await response.Content.ReadFromJsonAsync<JobPostingImportResponse>();
        var saved = await _client.GetFromJsonAsync<PagedApplicationsResponse>("/api/v1/applications?search=Tech%20Lead");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("Acme", draft!.Company);
        Assert.Equal("Tech Lead", draft.Role);
        Assert.Equal("Milano", draft.Location);
        Assert.Equal(url, draft.Url);
        Assert.Equal(["company", "role", "location"], draft.Found);
        Assert.False(draft.NeedsText);
        Assert.Equal(0, saved!.TotalCount);
    }

    [Theory]
    [InlineData("https://www.linkedin.com/jobs/view/4012345678/", "LinkedIn")]
    [InlineData("https://lnkd.in/abc", "LinkedIn")]
    [InlineData("https://it.indeed.com/viewjob?jk=abc", "Indeed")]
    [InlineData("https://www.glassdoor.it/job-listing/x", "Glassdoor")]
    public async Task SitesThatForbidAutomatedReading_AreNeverContacted_AndTheTextIsAskedFor(string url, string source)
    {
        var response = await _client.PostAsJsonAsync(Route, new JobPostingImportRequest(url, null));
        var draft = await response.Content.ReadFromJsonAsync<JobPostingImportResponse>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True(draft!.NeedsText);
        Assert.Contains("copia il testo", draft.Message);
        Assert.Equal(source, draft.Source);
        Assert.Equal(url, draft.Url);
        Assert.DoesNotContain(_factory.Fetcher.Requested, requested => requested.ToString() == url);
    }

    [Fact]
    public async Task PastedText_IsReadWithoutOpeningTheLink()
    {
        const string url = "https://www.linkedin.com/jobs/view/999/";
        var text = "Cloud Engineer\nOmega Spa · Torino, Piemonte · 1 settimana fa\nIbrido\nRAL 50.000 €";

        var response = await _client.PostAsJsonAsync(Route, new JobPostingImportRequest(url, text));
        var draft = await response.Content.ReadFromJsonAsync<JobPostingImportResponse>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("Omega Spa", draft!.Company);
        Assert.Equal("Cloud Engineer", draft.Role);
        Assert.Equal("Torino, Piemonte (ibrido)", draft.Location);
        Assert.Equal("50.000 €", draft.SalaryRange);
        Assert.Equal("LinkedIn", draft.Source);
        Assert.Equal(["company", "role", "location", "salaryRange"], draft.Found);
        Assert.DoesNotContain(_factory.Fetcher.Requested, requested => requested.ToString() == url);
    }

    [Fact]
    public async Task APageWithoutJobData_AsksForTheText()
    {
        const string url = "https://www.example.org/news";
        _factory.Fetcher.Pages[url] = "<html><body>Nessun annuncio qui</body></html>";

        var draft = await (await _client.PostAsJsonAsync(Route, new JobPostingImportRequest(url, null))).Content.ReadFromJsonAsync<JobPostingImportResponse>();

        Assert.True(draft!.NeedsText);
        Assert.Empty(draft.Found);
        Assert.Contains("Non ho trovato", draft.Message);
    }

    [Fact]
    public async Task APageThatCannotBeRead_AnswersAClearProblem()
    {
        var response = await _client.PostAsJsonAsync(Route, new JobPostingImportRequest("https://unreachable.example.com/job", null));
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        Assert.Equal("Il sito non risponde o l'indirizzo non esiste.", problem.GetProperty("title").GetString());
    }

    public static TheoryData<string, JobPostingImportRequest> InvalidRequests() => new()
    {
        { "Url", new JobPostingImportRequest(null, null) },
        { "Url", new JobPostingImportRequest("  ", " ") },
        { "Url", new JobPostingImportRequest("not a url", null) },
        { "Url", new JobPostingImportRequest("javascript:alert(1)", null) },
        { "Url", new JobPostingImportRequest("file:///etc/passwd", null) },
        { "Url", new JobPostingImportRequest("ftp://example.com/job", null) },
        { "Url", new JobPostingImportRequest("https://user:secret@example.com/job", null) },
        { "Url", new JobPostingImportRequest("https://example.com/" + new string('a', 1000), null) },
        { "Text", new JobPostingImportRequest(null, new string('t', 20_001)) }
    };

    [Theory]
    [MemberData(nameof(InvalidRequests))]
    public async Task InvalidInput_IsRejectedWithTheFieldName(string field, JobPostingImportRequest request)
    {
        var response = await _client.PostAsJsonAsync(Route, request);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.True(problem.GetProperty("errors").TryGetProperty(field, out _), $"expected an error for {field}");
    }
}
