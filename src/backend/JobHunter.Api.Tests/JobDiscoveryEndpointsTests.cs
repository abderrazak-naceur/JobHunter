using System.Net;
using System.Net.Http.Json;
using JobHunter.Api.Contracts;

namespace JobHunter.Api.Tests;

public sealed class JobDiscoveryEndpointsTests : IClassFixture<JobHunterApiFactory>
{
    private const string BaseRoute = "/api/v1/job-discovery";
    private readonly HttpClient _client;
    private readonly JobHunterApiFactory _factory;

    public JobDiscoveryEndpointsTests(JobHunterApiFactory factory)
    {
        _factory = factory;
        _client = factory.CreateAuthenticatedClient();
    }

    [Fact]
    public async Task Profile_CanBeCreatedAndOnlyOneProfileRemainsActive()
    {
        var first = new SearchProfileRequest(
            "Profilo uno", "Senior .NET Developer", "C#, .NET", "Milano", 50000m, "Hybrid", 35, true);
        var second = first with { Name = "Profilo due", IsActive = true };

        var createdFirst = await _client.PostAsJsonAsync($"{BaseRoute}/profiles", first);
        var createdSecond = await _client.PostAsJsonAsync($"{BaseRoute}/profiles", second);
        var profiles = await _client.GetFromJsonAsync<SearchProfileResponse[]>($"{BaseRoute}/profiles");

        Assert.Equal(HttpStatusCode.Created, createdFirst.StatusCode);
        Assert.Equal(HttpStatusCode.Created, createdSecond.StatusCode);
        Assert.NotNull(profiles);
        Assert.Equal(2, profiles.Length);
        Assert.Single(profiles, x => x.IsActive);
        Assert.Contains(profiles, x => x.Name == "Profilo due" && x.IsActive);
    }

    [Fact]
    public async Task Profile_RejectsInvalidMinimumSalaryAndWorkMode()
    {
        var request = new SearchProfileRequest(
            "Profilo", "Developer", "C#", "Milano", -1m, "Somewhere", 35, true);

        var response = await _client.PostAsJsonAsync($"{BaseRoute}/profiles", request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
        Assert.True(problem.GetProperty("errors").TryGetProperty("MinimumAnnualSalary", out _));
        Assert.True(problem.GetProperty("errors").TryGetProperty("WorkMode", out _));
    }

    [Theory]
    [InlineData("LinkedIn")]
    [InlineData("Unknown")]
    [InlineData("http")]
    public async Task Source_RejectsUnsupportedProviders(string provider)
    {
        var response = await _client.PostAsJsonAsync($"{BaseRoute}/sources",
            new JobSourceRequest("Example", provider, "example-board", "https://example.com/careers", true));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Theory]
    [InlineData("example.com/path")]
    [InlineData("../other-board")]
    [InlineData("board?redirect=https")]
    public async Task Source_RejectsBoardIdentifiersThatCouldChangeTheApiHost(string identifier)
    {
        var response = await _client.PostAsJsonAsync($"{BaseRoute}/sources",
            new JobSourceRequest("Example", "Lever", identifier, "https://example.com/careers", true));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Theory]
    [InlineData("Lever")]
    [InlineData("Lever-EU")]
    [InlineData("Greenhouse")]
    public async Task Source_AcceptsSupportedProviderRegions(string provider)
    {
        var unique = Guid.NewGuid().ToString("N");
        var response = await _client.PostAsJsonAsync($"{BaseRoute}/sources",
            new JobSourceRequest("Example", provider, unique, "https://example.com/careers", true));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Fact]
    public async Task Source_CanBeCreatedAndDuplicateBoardIsRejected()
    {
        var unique = Guid.NewGuid().ToString("N");
        var request = new JobSourceRequest("Example", "Lever", unique, "https://jobs.lever.co/example", true);

        var createdResponse = await _client.PostAsJsonAsync($"{BaseRoute}/sources", request);
        var duplicateResponse = await _client.PostAsJsonAsync($"{BaseRoute}/sources", request);
        var sources = await _client.GetFromJsonAsync<JobSourceResponse[]>($"{BaseRoute}/sources");

        Assert.Equal(HttpStatusCode.Created, createdResponse.StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, duplicateResponse.StatusCode);
        Assert.NotNull(sources);
        Assert.Contains(sources, x => x.Provider == "lever" && x.BoardIdentifier == unique);
    }

    [Fact]
    public async Task Jobs_AreInitiallyEmptyAndCanBePaged()
    {
        var response = await _client.GetFromJsonAsync<PagedJobListingsResponse>($"{BaseRoute}/jobs?page=1&pageSize=5");

        Assert.NotNull(response);
        Assert.Equal(1, response.Page);
        Assert.Equal(5, response.PageSize);
        Assert.Empty(response.Items);
    }

    [Fact]
    public async Task JobDiscoveryEndpoints_RequireAuthentication()
    {
        using var anonymous = _factory.CreateClient();
        var response = await anonymous.GetAsync($"{BaseRoute}/profiles");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
