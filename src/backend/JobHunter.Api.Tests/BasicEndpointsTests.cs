using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace JobHunter.Api.Tests;

public sealed class BasicEndpointsTests : IClassFixture<JobHunterApiFactory>
{
    private readonly HttpClient _client;

    public BasicEndpointsTests(JobHunterApiFactory factory) => _client = factory.CreateClient();

    [Fact]
    public async Task Health_ReturnsHealthy()
    {
        var response = await _client.GetAsync("/health");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Healthy", body.GetProperty("status").GetString());
    }

    [Fact]
    public async Task Root_ReportsRunningStatus()
    {
        var body = await _client.GetFromJsonAsync<JsonElement>("/");

        Assert.Equal("Portfolio API", body.GetProperty("name").GetString());
        Assert.Equal("running", body.GetProperty("status").GetString());
    }
}
