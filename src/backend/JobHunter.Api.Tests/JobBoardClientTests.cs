using System.Net;
using System.Text;
using JobHunter.Api.Domain;
using JobHunter.Api.Infrastructure.JobDiscovery;
using Microsoft.Extensions.Configuration;

namespace JobHunter.Api.Tests;

public sealed class JobBoardClientTests
{
    [Fact]
    public async Task Lever_DoesNotInventPublicationDateFromUndocumentedCreationMetadata()
    {
        const string json = """
            [{
              "id":"lever-123",
              "text":"Senior .NET Developer",
              "hostedUrl":"https://jobs.lever.co/example/lever-123",
              "applyUrl":"https://jobs.lever.co/example/lever-123/apply",
              "createdAt":1794614400000,
              "categories":{"location":"Milano"}
            }]
            """;
        var client = Create(json);
        var results = await client.FetchAsync(
            new JobSource { Provider = "lever", BoardIdentifier = "example", CompanyName = "Example" },
            null, CancellationToken.None);

        var posting = Assert.Single(results);
        Assert.Equal("Senior .NET Developer", posting.Title);
        Assert.Equal("Example", posting.CompanyName);
        Assert.Equal("Milano", posting.Location);
        Assert.Null(posting.PublishedAt);
    }

    [Fact]
    public async Task Greenhouse_KeepsFirstPublishedAndSourceUpdatedAsDifferentDates()
    {
        const string json = """
            {
              "jobs":[{
                "id":123,
                "title":"Technical Lead C#",
                "absolute_url":"https://boards.greenhouse.io/example/jobs/123",
                "first_published":"2026-11-10T09:00:00Z",
                "updated_at":"2026-11-12T10:00:00Z",
                "location":{"name":"Milano"},
                "content":"<p>RAL 50.000 euro</p>"
              }]
            }
            """;
        var client = Create(json);
        var results = await client.FetchAsync(
            new JobSource { Provider = "greenhouse", BoardIdentifier = "example", CompanyName = "Example" },
            null, CancellationToken.None);

        var posting = Assert.Single(results);
        Assert.Equal(DateTimeOffset.Parse("2026-11-10T09:00:00Z"), posting.PublishedAt);
        Assert.Equal(DateTimeOffset.Parse("2026-11-12T10:00:00Z"), posting.SourceUpdatedAt);
        Assert.Contains("50.000", posting.SalaryText);
    }

    [Fact]
    public async Task LeverEu_UsesTheEuropeanPublicApiEndpoint()
    {
        var handler = new RecordingHandler();
        var client = new JobBoardClient(new HttpClient(handler), new ConfigurationBuilder().Build());

        await client.FetchAsync(
            new JobSource { Provider = "lever-eu", BoardIdentifier = "example" },
            null, CancellationToken.None);

        Assert.Equal("https://api.eu.lever.co/v0/postings/example?mode=json", handler.RequestUri?.ToString());
    }

    [Fact]
    public async Task Arbeitnow_MapsCompanyRemoteFlagAndPublicationTimestamp()
    {
        const string json = """
            {
              "data":[{
                "slug":"senior-dotnet-engineer-123",
                "title":"Senior .NET Engineer",
                "company_name":"Example GmbH",
                "description":"<p>Build <strong>.NET</strong> services</p>",
                "remote":true,
                "url":"https://www.arbeitnow.com/jobs/senior-dotnet-engineer-123",
                "location":"Europe",
                "created_at":1794614400
              }]
            }
            """;
        var client = Create(json);
        var results = await client.FetchAsync(
            new JobSource { Provider = "arbeitnow", BoardIdentifier = "europe" },
            null, CancellationToken.None);

        var posting = Assert.Single(results);
        Assert.Equal("Example GmbH", posting.CompanyName);
        Assert.Equal("Remote", posting.WorkMode);
        Assert.Equal("Europe", posting.Location);
        Assert.NotNull(posting.PublishedAt);
        Assert.Contains(".NET", posting.Description);
    }

    [Fact]
    public async Task Jobicy_MapsRemoteEuropeanJobsAndKeepsTheCanonicalListingUrl()
    {
        const string json = """
            {
              "jobs":[{
                "id":123,
                "url":"https://jobicy.com/jobs/senior-dotnet-engineer",
                "jobTitle":"Senior .NET Engineer",
                "companyName":"Example Remote",
                "jobGeo":"Europe",
                "jobDescription":"<p>C# and .NET services</p>",
                "pubDate":"2026-11-13T10:00:00Z",
                "salaryMin":60000,
                "salaryMax":80000,
                "salaryCurrency":"EUR",
                "salaryPeriod":"yearly"
              }]
            }
            """;
        var client = Create(json);
        var results = await client.FetchAsync(
            new JobSource { Provider = "jobicy", BoardIdentifier = "europe" },
            null, CancellationToken.None);

        var posting = Assert.Single(results);
        Assert.Equal("Senior .NET Engineer", posting.Title);
        Assert.Equal("Example Remote", posting.CompanyName);
        Assert.Equal("Remote", posting.WorkMode);
        Assert.Equal("https://jobicy.com/jobs/senior-dotnet-engineer", posting.SourceUrl);
        Assert.Equal(posting.SourceUrl, posting.ApplyUrl);
        Assert.Contains("EUR", posting.SalaryText);
        Assert.Contains("annui", posting.SalaryText);
        Assert.NotNull(posting.PublishedAt);
    }

    [Fact]
    public async Task Adzuna_UsesTheSavedSearchProfileAndItalianEndpoint()
    {
        var handler = new RecordingHandler();
        var configuration = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["JobDiscovery:Adzuna:AppId"] = "test-id",
            ["JobDiscovery:Adzuna:AppKey"] = "test-key"
        }).Build();
        var client = new JobBoardClient(new HttpClient(handler), configuration);
        var profile = new JobSearchProfile
        {
            RoleKeywords = "Senior .NET Developer",
            Location = "Milano",
            MinimumAnnualSalary = 50000
        };

        await client.FetchAsync(
            new JobSource { Provider = "adzuna", BoardIdentifier = "it" },
            profile, CancellationToken.None);

        Assert.Contains("api.adzuna.com/v1/api/jobs/it/search/1", handler.RequestUri?.ToString());
        Assert.Contains("where=Milano", handler.RequestUri?.ToString());
        Assert.Contains("what=Senior%20.NET%20Developer", handler.RequestUri?.ToString());
    }

    [Fact]
    public async Task Jooble_UsesTheItalianEndpointAndSavedProfile()
    {
        var handler = new RecordingHandler();
        var configuration = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["JobDiscovery:Jooble:ApiKey"] = "test-key"
        }).Build();
        var client = new JobBoardClient(new HttpClient(handler), configuration);

        await client.FetchAsync(
            new JobSource { Provider = "jooble", BoardIdentifier = "it" },
            new JobSearchProfile { RoleKeywords = "Senior .NET Developer", Location = "Milano" },
            CancellationToken.None);

        Assert.Equal("https://it.jooble.org/api/test-key", handler.RequestUri?.ToString());
    }

    [Fact]
    public async Task Client_RejectsBoardIdentifierContainingAUrl()
    {
        var client = Create("""[]""");

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            client.FetchAsync(
                new JobSource { Provider = "lever", BoardIdentifier = "example.com" },
                null, CancellationToken.None));
    }

    private static JobBoardClient Create(string json)
    {
        var handler = new StaticResponseHandler(json);
        return new JobBoardClient(new HttpClient(handler), new ConfigurationBuilder().Build());
    }

    private sealed class RecordingHandler : HttpMessageHandler
    {
        public Uri? RequestUri { get; private set; }

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            RequestUri = request.RequestUri;
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent("""{"data":[],"results":[],"jobs":[]}""", Encoding.UTF8, "application/json")
            });
        }
    }

    private sealed class StaticResponseHandler(string json) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken) =>
            Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(json, Encoding.UTF8, "application/json")
            });
    }
}
