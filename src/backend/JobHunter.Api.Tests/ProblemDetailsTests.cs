using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using JobHunter.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace JobHunter.Api.Tests;

public sealed class ProblemDetailsTests : IClassFixture<JobHunterApiFactory>
{
    private readonly JobHunterApiFactory _factory;

    public ProblemDetailsTests(JobHunterApiFactory factory) => _factory = factory;

    [Fact]
    public async Task AnUnexpectedFailure_AnswersAProblemWithTheCorrelationId_AndNoInternalDetails()
    {
        using var broken = _factory.WithWebHostBuilder(builder => builder.ConfigureServices(services =>
        {
            services.RemoveAll<DbContextOptions<JobHunterDbContext>>();
            services.AddDbContext<JobHunterDbContext>(options =>
                options.UseSqlite("Data Source=Z:\\does-not-exist\\missing.db;Mode=ReadOnly"));
        }));
        using var request = new HttpRequestMessage(HttpMethod.Get, "/api/v1/portfolio");
        request.Headers.Add(CorrelationIdMiddleware.HeaderName, "support-ticket-4711");

        var response = await broken.CreateClient().SendAsync(request);
        var text = await response.Content.ReadAsStringAsync();
        var problem = JsonDocument.Parse(text).RootElement;

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType!.MediaType);
        Assert.Equal(500, problem.GetProperty("status").GetInt32());
        Assert.Equal("support-ticket-4711", problem.GetProperty("correlationId").GetString());
        Assert.DoesNotContain("does-not-exist", text);
        Assert.DoesNotContain("Sqlite", text, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("   at ", text); // no stack trace
    }

    [Fact]
    public async Task AnUnknownRoute_ForASignedInAdmin_AnswersANotFoundProblem()
    {
        var response = await _factory.CreateAuthenticatedClient().GetAsync("/api/v1/nothing-here");
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType!.MediaType);
        Assert.Equal(404, problem.GetProperty("status").GetInt32());
        Assert.True(problem.TryGetProperty("correlationId", out _));
    }

    [Fact]
    public async Task ValidationErrors_StayInTheDocumentedShape()
    {
        var response = await _factory.CreateAuthenticatedClient().PostAsJsonAsync("/api/v1/contacts",
            new { name = "", kind = "Recruiter" });
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.True(problem.GetProperty("errors").TryGetProperty("Name", out _));
    }

    [Fact]
    public async Task ARequestWithoutToken_StillAnswers401()
    {
        var response = await _factory.CreateClient().GetAsync("/api/v1/applications");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
