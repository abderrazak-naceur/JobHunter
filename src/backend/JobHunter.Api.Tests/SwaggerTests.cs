using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace JobHunter.Api.Tests;

public sealed class SwaggerEnabledTests : IClassFixture<SwaggerApiFactory>
{
    private readonly HttpClient _client;

    public SwaggerEnabledTests(SwaggerApiFactory factory) => _client = factory.CreateClient();

    private async Task<JsonElement> OpenApiAsync() => await _client.GetFromJsonAsync<JsonElement>("/openapi/v1.json");

    private static JsonElement Operation(JsonElement document, string path, string method) =>
        document.GetProperty("paths").GetProperty(path).GetProperty(method);

    [Fact]
    public async Task SwaggerUi_IsServedWithoutLogin_AndPointsToTheOpenApiDocument()
    {
        var response = await _client.GetAsync("/swagger/index.html");
        var html = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("text/html", response.Content.Headers.ContentType!.MediaType);
        Assert.Contains("swagger-ui", html);
        Assert.Contains("Portfolio API", html);
    }

    [Fact]
    public async Task OpenApiDocument_HasATitleAndExplainsHowToSignIn()
    {
        var info = (await OpenApiAsync()).GetProperty("info");

        Assert.Equal("Portfolio API", info.GetProperty("title").GetString());
        Assert.Contains("/api/v1/auth/login", info.GetProperty("description").GetString());
    }

    [Fact]
    public async Task OpenApiDocument_DefinesTheBearerTokenScheme()
    {
        var scheme = (await OpenApiAsync()).GetProperty("components").GetProperty("securitySchemes").GetProperty("Bearer");

        Assert.Equal("http", scheme.GetProperty("type").GetString());
        Assert.Equal("bearer", scheme.GetProperty("scheme").GetString());
        Assert.Equal("JWT", scheme.GetProperty("bearerFormat").GetString());
    }

    [Theory]
    [InlineData("/api/v1/companies", "get")]
    [InlineData("/api/v1/companies", "post")]
    [InlineData("/api/v1/applications", "get")]
    [InlineData("/api/v1/applications/summary", "get")]
    [InlineData("/api/v1/applications/{id}", "delete")]
    [InlineData("/api/v1/portfolio", "put")]
    [InlineData("/api/v1/portfolio/photo", "put")]
    [InlineData("/api/v1/portfolio/photo", "delete")]
    [InlineData("/api/v1/auth/me", "get")]
    public async Task ProtectedOperations_AreMarkedAsNeedingTheToken(string path, string method)
    {
        var operation = Operation(await OpenApiAsync(), path, method);

        Assert.True(operation.TryGetProperty("security", out var security), $"{method.ToUpperInvariant()} {path} should require the token.");
        Assert.True(security.GetArrayLength() > 0);
        Assert.True(security[0].TryGetProperty("Bearer", out _));
    }

    [Theory]
    [InlineData("/", "get")]
    [InlineData("/health", "get")]
    [InlineData("/api/v1/auth/login", "post")]
    [InlineData("/api/v1/portfolio", "get")]
    [InlineData("/api/v1/portfolio/photo", "get")]
    public async Task PublicOperations_AreNotMarkedAsNeedingTheToken(string path, string method)
    {
        var operation = Operation(await OpenApiAsync(), path, method);

        Assert.False(operation.TryGetProperty("security", out _), $"{method.ToUpperInvariant()} {path} is public.");
    }
}

public sealed class SwaggerDisabledByDefaultTests : IClassFixture<JobHunterApiFactory>
{
    private readonly HttpClient _client;

    public SwaggerDisabledByDefaultTests(JobHunterApiFactory factory) => _client = factory.CreateClient();

    [Theory]
    [InlineData("/swagger/index.html")]
    [InlineData("/openapi/v1.json")]
    public async Task SwaggerAndTheOpenApiDocument_AreNotExposedUnlessEnabled(string url)
    {
        var response = await _client.GetAsync(url);
        var body = await response.Content.ReadAsStringAsync();

        // Nothing is served. Unknown addresses answer 401 because every route needs a login by default.
        Assert.Contains(response.StatusCode, new[] { HttpStatusCode.NotFound, HttpStatusCode.Unauthorized });
        Assert.DoesNotContain("swagger-ui", body);
        Assert.DoesNotContain("openapi", body, StringComparison.OrdinalIgnoreCase);
    }
}
