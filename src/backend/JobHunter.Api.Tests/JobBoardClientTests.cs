using System.Net;
using System.Text;
using JobHunter.Api.Domain;
using JobHunter.Api.Infrastructure.JobDiscovery;

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
        var results = await client.FetchAsync(new JobSource { Provider = "lever", BoardIdentifier = "example" }, CancellationToken.None);

        var posting = Assert.Single(results);
        Assert.Equal("Senior .NET Developer", posting.Title);
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
        var results = await client.FetchAsync(new JobSource { Provider = "greenhouse", BoardIdentifier = "example" }, CancellationToken.None);

        var posting = Assert.Single(results);
        Assert.Equal(DateTimeOffset.Parse("2026-11-10T09:00:00Z"), posting.PublishedAt);
        Assert.Equal(DateTimeOffset.Parse("2026-11-12T10:00:00Z"), posting.SourceUpdatedAt);
        Assert.Contains("50.000", posting.SalaryText);
    }

    [Fact]
    public async Task LeverEu_UsesTheEuropeanPublicApiEndpoint()
    {
        var handler = new RecordingHandler();
        var client = new JobBoardClient(new HttpClient(handler));

        await client.FetchAsync(new JobSource { Provider = "lever-eu", BoardIdentifier = "example" }, CancellationToken.None);

        Assert.Equal("https://api.eu.lever.co/v0/postings/example?mode=json", handler.RequestUri?.ToString());
    }

    [Fact]
    public async Task Client_RejectsBoardIdentifierContainingAUrl()
    {
        var client = Create("""[]""");

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            client.FetchAsync(new JobSource { Provider = "lever", BoardIdentifier = "example.com" }, CancellationToken.None));
    }

    private static JobBoardClient Create(string json)
    {
        var handler = new StaticResponseHandler(json);
        return new JobBoardClient(new HttpClient(handler));
    }

    private sealed class RecordingHandler : HttpMessageHandler
    {
        public Uri? RequestUri { get; private set; }

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            RequestUri = request.RequestUri;
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent("[]", Encoding.UTF8, "application/json")
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
