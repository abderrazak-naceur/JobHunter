using System.Net;
using System.Net.Http.Json;
using JobHunter.Api.Contracts;

namespace JobHunter.Api.Tests;

public sealed class CompanyEndpointsTests : IClassFixture<JobHunterApiFactory>
{
    private const string BaseRoute = "/api/v1/companies";
    private readonly HttpClient _client;

    public CompanyEndpointsTests(JobHunterApiFactory factory) => _client = factory.CreateAuthenticatedClient();

    private static CompanyRequest NewRequest(
        string? name = null,
        string? careersUrl = null,
        string priority = "Media",
        string? technologies = ".NET, C#",
        bool followed = true)
    {
        var unique = Guid.NewGuid().ToString("N");
        return new CompanyRequest(
            name ?? $"Acme {unique}",
            "https://acme.example",
            careersUrl ?? $"https://acme.example/careers/{unique}",
            "Milano",
            "Software / IT",
            technologies,
            priority,
            "note",
            followed);
    }

    private async Task<CompanyResponse> CreateAsync(CompanyRequest request)
    {
        var response = await _client.PostAsJsonAsync(BaseRoute, request);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<CompanyResponse>())!;
    }

    [Fact]
    public async Task Post_WithValidRequest_ReturnsCreatedWithLocation()
    {
        var request = NewRequest();

        var response = await _client.PostAsJsonAsync(BaseRoute, request);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var created = await response.Content.ReadFromJsonAsync<CompanyResponse>();
        Assert.NotNull(created);
        Assert.NotEqual(Guid.Empty, created.Id);
        Assert.Equal(request.Name, created.Name);
        Assert.Equal($"{BaseRoute}/{created.Id}", response.Headers.Location?.OriginalString);
    }

    [Fact]
    public async Task Post_TrimsWhitespaceAndDefaultsOptionalFieldsToEmpty()
    {
        var unique = Guid.NewGuid().ToString("N");
        var request = new CompanyRequest($"  Trim {unique}  ", null, $" https://trim.example/{unique} ", null, null, null, "Alta", null, false);

        var created = await CreateAsync(request);

        Assert.Equal($"Trim {unique}", created.Name);
        Assert.Equal($"https://trim.example/{unique}", created.CareersUrl);
        Assert.Equal(string.Empty, created.Website);
        Assert.Equal(string.Empty, created.Location);
        Assert.Equal(string.Empty, created.Notes);
        Assert.False(created.Followed);
    }

    [Fact]
    public async Task Post_WithDuplicateCareersUrl_ReturnsConflict()
    {
        var request = NewRequest();
        await CreateAsync(request);

        var response = await _client.PostAsJsonAsync(BaseRoute, request with { Name = "Other name" });

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    public static TheoryData<string, CompanyRequest> InvalidRequests() => new()
    {
        { "Name", NewRequest(name: "   ") },
        { "Name", NewRequest(name: new string('a', 181)) },
        { "CareersUrl", NewRequest(careersUrl: "not-a-url") },
        { "CareersUrl", NewRequest(careersUrl: "ftp://acme.example/careers") },
        { "Website", NewRequest() with { Website = "javascript:alert(1)" } },
        { "Priority", NewRequest(priority: "Urgente") },
        { "Technologies", NewRequest(technologies: new string('t', 1001)) },
        { "Notes", NewRequest() with { Notes = new string('n', 4001) } },
        { "Location", NewRequest() with { Location = new string('l', 181) } },
        { "Sector", NewRequest() with { Sector = new string('s', 181) } },
    };

    [Theory]
    [MemberData(nameof(InvalidRequests))]
    public async Task Post_WithInvalidRequest_ReturnsValidationProblemForField(string field, CompanyRequest request)
    {
        var response = await _client.PostAsJsonAsync(BaseRoute, request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
        Assert.True(problem.GetProperty("errors").TryGetProperty(field, out _), $"Expected a validation error for '{field}'.");
    }

    [Fact]
    public async Task Get_ById_ReturnsCompanyOrNotFound()
    {
        var created = await CreateAsync(NewRequest());

        var found = await _client.GetAsync($"{BaseRoute}/{created.Id}");
        var missing = await _client.GetAsync($"{BaseRoute}/{Guid.NewGuid()}");

        Assert.Equal(HttpStatusCode.OK, found.StatusCode);
        Assert.Equal(created.Id, (await found.Content.ReadFromJsonAsync<CompanyResponse>())!.Id);
        Assert.Equal(HttpStatusCode.NotFound, missing.StatusCode);
    }

    [Fact]
    public async Task Put_UpdatesCompany_AndBumpsUpdatedAt()
    {
        var created = await CreateAsync(NewRequest());

        var response = await _client.PutAsJsonAsync($"{BaseRoute}/{created.Id}",
            NewRequest(name: "Renamed", careersUrl: created.CareersUrl, priority: "Alta", followed: false));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var updated = (await response.Content.ReadFromJsonAsync<CompanyResponse>())!;
        Assert.Equal("Renamed", updated.Name);
        Assert.Equal("Alta", updated.Priority);
        Assert.False(updated.Followed);
        Assert.True(updated.UpdatedAt >= created.UpdatedAt);
    }

    [Fact]
    public async Task Put_WithUnknownId_ReturnsNotFound()
    {
        var response = await _client.PutAsJsonAsync($"{BaseRoute}/{Guid.NewGuid()}", NewRequest());

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Put_WithCareersUrlOfAnotherCompany_ReturnsConflict()
    {
        var first = await CreateAsync(NewRequest());
        var second = await CreateAsync(NewRequest());

        var response = await _client.PutAsJsonAsync($"{BaseRoute}/{second.Id}", NewRequest(careersUrl: first.CareersUrl));

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task Put_WithInvalidRequest_ReturnsBadRequest()
    {
        var created = await CreateAsync(NewRequest());

        var response = await _client.PutAsJsonAsync($"{BaseRoute}/{created.Id}", NewRequest(name: ""));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Delete_RemovesCompany_ThenReturnsNotFound()
    {
        var created = await CreateAsync(NewRequest());

        var first = await _client.DeleteAsync($"{BaseRoute}/{created.Id}");
        var second = await _client.DeleteAsync($"{BaseRoute}/{created.Id}");
        var get = await _client.GetAsync($"{BaseRoute}/{created.Id}");

        Assert.Equal(HttpStatusCode.NoContent, first.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, second.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, get.StatusCode);
    }

    [Fact]
    public async Task List_SearchIsCaseInsensitiveAcrossNameLocationSectorAndTechnologies()
    {
        var token = Guid.NewGuid().ToString("N");
        var byName = await CreateAsync(NewRequest(name: $"Zeta{token}Corp"));
        var byTech = await CreateAsync(NewRequest(technologies: $"Rust{token}"));
        await CreateAsync(NewRequest());

        var result = await _client.GetFromJsonAsync<PagedCompaniesResponse>($"{BaseRoute}?search={token.ToUpperInvariant()}");

        Assert.NotNull(result);
        Assert.Equal(2, result.TotalCount);
        Assert.Contains(result.Items, c => c.Id == byName.Id);
        Assert.Contains(result.Items, c => c.Id == byTech.Id);
    }

    [Fact]
    public async Task List_FiltersByFollowedAndPriority()
    {
        var token = Guid.NewGuid().ToString("N");
        var match = await CreateAsync(NewRequest(name: $"Match{token}", priority: "Alta", followed: false));
        await CreateAsync(NewRequest(name: $"Other{token}", priority: "Alta", followed: true));
        await CreateAsync(NewRequest(name: $"Low{token}", priority: "Bassa", followed: false));

        var result = await _client.GetFromJsonAsync<PagedCompaniesResponse>(
            $"{BaseRoute}?search={token}&followed=false&priority=Alta");

        Assert.NotNull(result);
        var single = Assert.Single(result.Items);
        Assert.Equal(match.Id, single.Id);
    }

    [Fact]
    public async Task List_OrdersByPriorityThenName_AndPaginates()
    {
        var token = Guid.NewGuid().ToString("N");
        await CreateAsync(NewRequest(name: $"B-{token}", priority: "Bassa"));
        await CreateAsync(NewRequest(name: $"M-{token}", priority: "Media"));
        await CreateAsync(NewRequest(name: $"A2-{token}", priority: "Alta"));
        await CreateAsync(NewRequest(name: $"A1-{token}", priority: "Alta"));

        var page1 = await _client.GetFromJsonAsync<PagedCompaniesResponse>($"{BaseRoute}?search={token}&page=1&pageSize=3");
        var page2 = await _client.GetFromJsonAsync<PagedCompaniesResponse>($"{BaseRoute}?search={token}&page=2&pageSize=3");

        Assert.NotNull(page1);
        Assert.NotNull(page2);
        Assert.Equal(4, page1.TotalCount);
        Assert.Equal([$"A1-{token}", $"A2-{token}", $"M-{token}"], page1.Items.Select(c => c.Name));
        Assert.Equal([$"B-{token}"], page2.Items.Select(c => c.Name));
    }

    [Theory]
    [InlineData("page=0&pageSize=0", 1, 1)]
    [InlineData("page=-5&pageSize=1000", 1, 100)]
    public async Task List_ClampsPagingParameters(string query, int expectedPage, int expectedPageSize)
    {
        var result = await _client.GetFromJsonAsync<PagedCompaniesResponse>($"{BaseRoute}?{query}");

        Assert.NotNull(result);
        Assert.Equal(expectedPage, result.Page);
        Assert.Equal(expectedPageSize, result.PageSize);
    }
}
