using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using JobHunter.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace JobHunter.Api.Tests;

public sealed class ObservabilityTests : IClassFixture<JobHunterApiFactory>
{
    private readonly JobHunterApiFactory _factory;

    public ObservabilityTests(JobHunterApiFactory factory) => _factory = factory;

    [Fact]
    public async Task Ready_ReportsHealthy_WhenTheDatabaseIsReachable()
    {
        var response = await _factory.CreateClient().GetAsync("/health/ready");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Healthy", body.GetProperty("database").GetString());
    }

    [Fact]
    public async Task Ready_Answers503WithoutDetails_WhenTheDatabaseCannotBeReached()
    {
        using var broken = _factory.WithWebHostBuilder(builder => builder.ConfigureServices(services =>
        {
            services.RemoveAll<DbContextOptions<JobHunterDbContext>>();
            services.AddDbContext<JobHunterDbContext>(options =>
                options.UseSqlite("Data Source=Z:\\does-not-exist\\missing.db;Mode=ReadOnly"));
        }));

        var response = await broken.CreateClient().GetAsync("/health/ready");
        var text = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        Assert.Contains("Unhealthy", text);
        Assert.DoesNotContain("does-not-exist", text);
    }

    [Fact]
    public async Task EveryResponse_CarriesACorrelationId()
    {
        var response = await _factory.CreateClient().GetAsync("/health");

        Assert.True(response.Headers.TryGetValues(CorrelationIdMiddleware.HeaderName, out var values));
        Assert.Matches("^[0-9a-f]{32}$", values!.Single());
    }

    [Fact]
    public async Task ASuppliedCorrelationId_IsEchoedBack()
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, "/health");
        request.Headers.Add(CorrelationIdMiddleware.HeaderName, "support-ticket-4711");

        var response = await _factory.CreateClient().SendAsync(request);

        Assert.Equal("support-ticket-4711", response.Headers.GetValues(CorrelationIdMiddleware.HeaderName).Single());
    }

    [Theory]
    [InlineData("short")]
    [InlineData("has spaces and <script>alert(1)</script>")]
    [InlineData("x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x")]
    public async Task AnUnsafeCorrelationId_IsReplaced(string supplied)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, "/health");
        request.Headers.TryAddWithoutValidation(CorrelationIdMiddleware.HeaderName, supplied);

        var response = await _factory.CreateClient().SendAsync(request);

        var returned = response.Headers.GetValues(CorrelationIdMiddleware.HeaderName).Single();
        Assert.NotEqual(supplied, returned);
        Assert.Matches("^[0-9a-f]{32}$", returned);
    }

    [Fact]
    public async Task Ready_DoesNotRequireAToken()
    {
        var response = await _factory.CreateClient().GetAsync("/health/ready");

        Assert.NotEqual(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
