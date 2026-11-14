using System.Net;
using System.Net.Http.Json;
using JobHunter.Api.Contracts;
using JobHunter.Api.Domain;
using JobHunter.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace JobHunter.Api.Tests;

public sealed class ApplicationEndpointsTests : IClassFixture<JobHunterApiFactory>
{
    private const string Route = "/api/v1/applications";
    private readonly JobHunterApiFactory _factory;
    private readonly HttpClient _client;

    public ApplicationEndpointsTests(JobHunterApiFactory factory)
    {
        _factory = factory;
        _client = factory.CreateAuthenticatedClient();
    }

    /// <summary>Unique company names keep tests independent although they share a database.</summary>
    private static ApplicationRequest NewRequest(
        string? company = null,
        string role = "Senior .NET Developer",
        string status = ApplicationStatuses.Saved,
        string? location = "Milano",
        string? source = "LinkedIn",
        DateOnly? nextStepOn = null) =>
        new(company ?? $"Acme {Guid.NewGuid():N}", role, status, source, "https://example.com/job", location, "50-60k",
            "Mario Rossi", "hr@example.com", null, nextStepOn is null ? null : "Chiamare HR", nextStepOn, "note");

    private async Task<ApplicationDetailResponse> CreateAsync(ApplicationRequest request)
    {
        var response = await _client.PostAsJsonAsync(Route, request);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<ApplicationDetailResponse>())!;
    }

    [Theory]
    [InlineData("GET", Route)]
    [InlineData("GET", Route + "/summary")]
    [InlineData("GET", Route + "/3f2b8a56-0000-0000-0000-000000000000")]
    [InlineData("POST", Route)]
    [InlineData("PUT", Route + "/3f2b8a56-0000-0000-0000-000000000000")]
    [InlineData("DELETE", Route + "/3f2b8a56-0000-0000-0000-000000000000")]
    public async Task EveryEndpoint_RequiresTheAdminToken(string method, string url)
    {
        var request = new HttpRequestMessage(new HttpMethod(method), url);
        if (method is "POST" or "PUT") request.Content = JsonContent.Create(NewRequest());

        var response = await _factory.CreateClient().SendAsync(request);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Post_CreatesTheApplication_AndRecordsTheFirstStatusInTheHistory()
    {
        var request = NewRequest(status: ApplicationStatuses.Applied) with { AppliedOn = new DateOnly(2026, 11, 3) };

        var created = await CreateAsync(request);

        Assert.NotEqual(Guid.Empty, created.Id);
        Assert.Equal(request.Company, created.Company);
        Assert.Equal(new DateOnly(2026, 11, 3), created.AppliedOn);
        var first = Assert.Single(created.Events);
        Assert.Null(first.FromStatus);
        Assert.Equal(ApplicationStatuses.Applied, first.ToStatus);
    }

    [Fact]
    public async Task Post_TrimsTextAndDefaultsOptionalFieldsToEmpty()
    {
        var request = new ApplicationRequest($"  Trim {Guid.NewGuid():N}  ", "  Dev  ", "Saved", null, null, null, null, null, null, null, null, null, null);

        var created = await CreateAsync(request);

        Assert.StartsWith("Trim ", created.Company);
        Assert.Equal("Dev", created.Role);
        Assert.Equal("", created.Source);
        Assert.Equal("", created.Notes);
        Assert.Null(created.NextStepOn);
    }

    public static TheoryData<string, ApplicationRequest> InvalidRequests() => new()
    {
        { "Company", NewRequest() with { Company = "  " } },
        { "Company", NewRequest() with { Company = new string('a', 181) } },
        { "Role", NewRequest() with { Role = "" } },
        { "Status", NewRequest() with { Status = "Hired" } },
        { "Status", NewRequest() with { Status = "" } },
        { "Url", NewRequest() with { Url = "javascript:alert(1)" } },
        { "Url", NewRequest() with { Url = "/relative" } },
        { "ContactEmail", NewRequest() with { ContactEmail = "not-an-email" } },
        { "Source", NewRequest() with { Source = new string('s', 121) } },
        { "Location", NewRequest() with { Location = new string('l', 181) } },
        { "SalaryRange", NewRequest() with { SalaryRange = new string('r', 121) } },
        { "ContactName", NewRequest() with { ContactName = new string('c', 181) } },
        { "NextStep", NewRequest() with { NextStep = new string('n', 251) } },
        { "Notes", NewRequest() with { Notes = new string('n', 4001) } },
        { "AppliedOn", NewRequest() with { AppliedOn = new DateOnly(1970, 1, 1) } },
        { "NextStepOn", NewRequest() with { NextStepOn = new DateOnly(2500, 1, 1) } },
    };

    [Theory]
    [MemberData(nameof(InvalidRequests))]
    public async Task Post_WithInvalidRequest_ReturnsValidationProblemForField(string field, ApplicationRequest request)
    {
        var response = await _client.PostAsJsonAsync(Route, request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
        Assert.True(problem.GetProperty("errors").TryGetProperty(field, out _), $"Expected a validation error for '{field}'.");
    }

    [Fact]
    public async Task Get_ById_ReturnsTheDetailOrNotFound()
    {
        var created = await CreateAsync(NewRequest());

        var found = await _client.GetAsync($"{Route}/{created.Id}");
        var missing = await _client.GetAsync($"{Route}/{Guid.NewGuid()}");

        Assert.Equal(HttpStatusCode.OK, found.StatusCode);
        Assert.Equal(created.Id, (await found.Content.ReadFromJsonAsync<ApplicationDetailResponse>())!.Id);
        Assert.Equal(HttpStatusCode.NotFound, missing.StatusCode);
    }

    [Fact]
    public async Task Put_UpdatesTheFields_AndBumpsUpdatedAt()
    {
        var created = await CreateAsync(NewRequest());
        await Task.Delay(20);

        var response = await _client.PutAsJsonAsync($"{Route}/{created.Id}", NewRequest(company: "Renamed", location: "Roma"));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var updated = (await response.Content.ReadFromJsonAsync<ApplicationDetailResponse>())!;
        Assert.Equal("Renamed", updated.Company);
        Assert.Equal("Roma", updated.Location);
        Assert.True(updated.UpdatedAt > created.UpdatedAt);
    }

    [Fact]
    public async Task Put_RecordsEveryStatusChange_NewestFirst_AndIgnoresUnchangedStatus()
    {
        var created = await CreateAsync(NewRequest(status: ApplicationStatuses.Saved));

        await _client.PutAsJsonAsync($"{Route}/{created.Id}", NewRequest(status: ApplicationStatuses.Applied));
        await _client.PutAsJsonAsync($"{Route}/{created.Id}", NewRequest(status: ApplicationStatuses.Applied, location: "Torino")); // same status
        await Task.Delay(20);
        await _client.PutAsJsonAsync($"{Route}/{created.Id}", NewRequest(status: ApplicationStatuses.Interview));

        var detail = (await _client.GetFromJsonAsync<ApplicationDetailResponse>($"{Route}/{created.Id}"))!;

        Assert.Equal([ApplicationStatuses.Interview, ApplicationStatuses.Applied, ApplicationStatuses.Saved], detail.Events.Select(e => e.ToStatus));
        Assert.Equal(ApplicationStatuses.Applied, detail.Events[0].FromStatus);
        Assert.Equal(ApplicationStatuses.Interview, detail.Status);
    }

    [Fact]
    public async Task Put_WithUnknownId_ReturnsNotFound()
    {
        var response = await _client.PutAsJsonAsync($"{Route}/{Guid.NewGuid()}", NewRequest());

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Put_WithInvalidRequest_ReturnsBadRequestAndKeepsTheOldValues()
    {
        var created = await CreateAsync(NewRequest());

        var response = await _client.PutAsJsonAsync($"{Route}/{created.Id}", NewRequest(company: "Changed") with { Status = "Nope" });
        var unchanged = (await _client.GetFromJsonAsync<ApplicationDetailResponse>($"{Route}/{created.Id}"))!;

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(created.Company, unchanged.Company);
    }

    [Fact]
    public async Task Delete_RemovesTheApplicationAndItsHistory()
    {
        var created = await CreateAsync(NewRequest());

        var first = await _client.DeleteAsync($"{Route}/{created.Id}");
        var second = await _client.DeleteAsync($"{Route}/{created.Id}");
        var get = await _client.GetAsync($"{Route}/{created.Id}");

        Assert.Equal(HttpStatusCode.NoContent, first.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, second.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, get.StatusCode);
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<JobHunterDbContext>();
        Assert.False(await db.ApplicationEvents.AnyAsync(e => e.ApplicationId == created.Id));
    }

    [Fact]
    public async Task List_SearchesCompanyRoleLocationAndSource_IgnoringCase()
    {
        var token = Guid.NewGuid().ToString("N");
        var byCompany = await CreateAsync(NewRequest(company: $"Zeta{token}Corp"));
        var byRole = await CreateAsync(NewRequest(role: $"Architect{token}"));
        var bySource = await CreateAsync(NewRequest(source: $"Referral{token}"));
        await CreateAsync(NewRequest());

        var result = await _client.GetFromJsonAsync<PagedApplicationsResponse>($"{Route}?search={token.ToUpperInvariant()}");

        Assert.Equal(3, result!.TotalCount);
        Assert.Equivalent(new[] { byCompany.Id, byRole.Id, bySource.Id }, result.Items.Select(i => i.Id));
    }

    [Fact]
    public async Task List_FiltersByStatus_AndRejectsAnUnknownStatus()
    {
        var token = Guid.NewGuid().ToString("N");
        await CreateAsync(NewRequest(company: $"A{token}", status: ApplicationStatuses.Applied));
        var interview = await CreateAsync(NewRequest(company: $"B{token}", status: ApplicationStatuses.Interview));

        var result = await _client.GetFromJsonAsync<PagedApplicationsResponse>($"{Route}?search={token}&status=Interview");
        var invalid = await _client.GetAsync($"{Route}?status=Hired");

        Assert.Equal(interview.Id, Assert.Single(result!.Items).Id);
        Assert.Equal(HttpStatusCode.BadRequest, invalid.StatusCode);
    }

    [Fact]
    public async Task List_OrdersByMostRecentlyUpdated_AndPaginates()
    {
        var token = Guid.NewGuid().ToString("N");
        var first = await CreateAsync(NewRequest(company: $"First{token}"));
        await Task.Delay(20);
        await CreateAsync(NewRequest(company: $"Second{token}"));
        await Task.Delay(20);
        await CreateAsync(NewRequest(company: $"Third{token}"));
        await Task.Delay(20);
        await _client.PutAsJsonAsync($"{Route}/{first.Id}", NewRequest(company: $"First{token}", location: "Updated"));

        var page1 = await _client.GetFromJsonAsync<PagedApplicationsResponse>($"{Route}?search={token}&page=1&pageSize=2");
        var page2 = await _client.GetFromJsonAsync<PagedApplicationsResponse>($"{Route}?search={token}&page=2&pageSize=2");

        Assert.Equal(3, page1!.TotalCount);
        Assert.Equal([$"First{token}", $"Third{token}"], page1.Items.Select(i => i.Company));
        Assert.Equal([$"Second{token}"], page2!.Items.Select(i => i.Company));
    }

    [Theory]
    [InlineData("page=0&pageSize=0", 1, 1)]
    [InlineData("page=-3&pageSize=1000", 1, 100)]
    public async Task List_ClampsPagingParameters(string query, int expectedPage, int expectedSize)
    {
        var result = await _client.GetFromJsonAsync<PagedApplicationsResponse>($"{Route}?{query}");

        Assert.Equal(expectedPage, result!.Page);
        Assert.Equal(expectedSize, result.PageSize);
    }
}

public sealed class ApplicationSummaryTests : IClassFixture<JobHunterApiFactory>
{
    private const string Route = "/api/v1/applications";
    private readonly HttpClient _client;

    public ApplicationSummaryTests(JobHunterApiFactory factory) => _client = factory.CreateAuthenticatedClient();

    private static ApplicationRequest Request(string company, string status, DateOnly? nextStepOn = null) =>
        new(company, "Dev", status, null, null, null, null, null, null, null, nextStepOn is null ? null : $"Passo {company}", nextStepOn, null);

    [Fact]
    public async Task Summary_CountsEveryStatus_AndListsOpenNextStepsOldestFirst()
    {
        await _client.PostAsJsonAsync(Route, Request("Saved1", ApplicationStatuses.Saved));
        await _client.PostAsJsonAsync(Route, Request("Applied1", ApplicationStatuses.Applied, new DateOnly(2026, 12, 20)));
        await _client.PostAsJsonAsync(Route, Request("Applied2", ApplicationStatuses.Applied, new DateOnly(2026, 11, 1)));
        await _client.PostAsJsonAsync(Route, Request("Rejected1", ApplicationStatuses.Rejected, new DateOnly(2026, 10, 1)));
        await _client.PostAsJsonAsync(Route, Request("Withdrawn1", ApplicationStatuses.Withdrawn, new DateOnly(2026, 10, 2)));

        var summary = (await _client.GetFromJsonAsync<ApplicationSummaryResponse>($"{Route}/summary"))!;

        Assert.Equal(5, summary.Total);
        Assert.Equal(2, summary.ByStatus[ApplicationStatuses.Applied]);
        Assert.Equal(1, summary.ByStatus[ApplicationStatuses.Saved]);
        Assert.Equal(0, summary.ByStatus[ApplicationStatuses.Offer]);
        Assert.Equal(ApplicationStatuses.All.Count, summary.ByStatus.Count);
        // Closed applications (rejected, withdrawn) no longer have a "next step".
        Assert.Equal(["Applied2", "Applied1"], summary.Upcoming.Select(u => u.Company));
        Assert.Equal(new DateOnly(2026, 11, 1), summary.Upcoming[0].NextStepOn);
    }
}
