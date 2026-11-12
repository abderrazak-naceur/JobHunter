using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using JobHunter.Api.Contracts;
using JobHunter.Api.Infrastructure.Auth;
using Microsoft.Extensions.DependencyInjection;

namespace JobHunter.Api.Tests;

public sealed class AuthEndpointsTests : IClassFixture<JobHunterApiFactory>
{
    private const string Login = "/api/v1/auth/login";
    private readonly JobHunterApiFactory _factory;
    private readonly HttpClient _anonymous;

    public AuthEndpointsTests(JobHunterApiFactory factory)
    {
        _factory = factory;
        _anonymous = factory.CreateClient();
    }

    private static LoginRequest ValidLogin() => new(JobHunterApiFactory.AdminUsername, JobHunterApiFactory.AdminPassword);

    private HttpClient ClientWithToken(string token)
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    [Fact]
    public async Task Login_WithValidCredentials_ReturnsATokenThatOpensProtectedEndpoints()
    {
        var response = await _anonymous.PostAsJsonAsync(Login, ValidLogin());

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = (await response.Content.ReadFromJsonAsync<LoginResponse>())!;
        Assert.False(string.IsNullOrWhiteSpace(body.AccessToken));
        Assert.True(body.ExpiresAt > DateTimeOffset.UtcNow);

        var protectedResponse = await ClientWithToken(body.AccessToken).GetAsync("/api/v1/companies");
        Assert.Equal(HttpStatusCode.OK, protectedResponse.StatusCode);
    }

    [Theory]
    [InlineData("admin", "wrong password")]
    [InlineData("someone-else", JobHunterApiFactory.AdminPassword)]
    [InlineData("someone-else", "wrong password")]
    public async Task Login_WithWrongCredentials_ReturnsTheSameGenericUnauthorized(string username, string password)
    {
        var response = await _anonymous.PostAsJsonAsync(Login, new LoginRequest(username, password));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("Credenziali non valide", body);
        Assert.DoesNotContain("token", body, StringComparison.OrdinalIgnoreCase);
    }

    [Theory]
    [InlineData(null, "pw")]
    [InlineData("admin", null)]
    [InlineData("  ", "pw")]
    [InlineData("admin", "")]
    public async Task Login_WithMissingFields_ReturnsBadRequest(string? username, string? password)
    {
        var response = await _anonymous.PostAsJsonAsync(Login, new LoginRequest(username, password));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Theory]
    [InlineData("GET", "/api/v1/companies")]
    [InlineData("GET", "/api/v1/companies/3f2b8a56-0000-0000-0000-000000000000")]
    [InlineData("POST", "/api/v1/companies")]
    [InlineData("PUT", "/api/v1/companies/3f2b8a56-0000-0000-0000-000000000000")]
    [InlineData("DELETE", "/api/v1/companies/3f2b8a56-0000-0000-0000-000000000000")]
    [InlineData("GET", "/api/v1/auth/me")]
    public async Task ProtectedEndpoints_WithoutToken_ReturnUnauthorized(string method, string url)
    {
        var request = new HttpRequestMessage(new HttpMethod(method), url);
        if (method is "POST" or "PUT") request.Content = JsonContent.Create(new { name = "x" });

        var response = await _anonymous.SendAsync(request);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Theory]
    [InlineData("/")]
    [InlineData("/health")]
    [InlineData("/api/v1/portfolio")]
    public async Task PublicEndpoints_DoNotRequireAToken(string url)
    {
        var response = await _anonymous.GetAsync(url);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Me_ReturnsTheSignedInUsername()
    {
        var response = await _factory.CreateAuthenticatedClient().GetFromJsonAsync<JsonElement>("/api/v1/auth/me");

        Assert.Equal(JobHunterApiFactory.AdminUsername, response.GetProperty("username").GetString());
    }

    [Fact]
    public async Task ExpiredToken_IsRejected()
    {
        var tokens = _factory.Services.GetRequiredService<TokenService>();
        var expired = tokens.CreateToken("admin", JobHunterApiFactory.AdminPasswordHash, lifetime: TimeSpan.FromMinutes(5), now: DateTimeOffset.UtcNow.AddHours(-1));

        var response = await ClientWithToken(expired.AccessToken).GetAsync("/api/v1/companies");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task TamperedToken_IsRejected()
    {
        var token = _factory.Services.GetRequiredService<TokenService>().CreateToken("admin", JobHunterApiFactory.AdminPasswordHash).AccessToken;
        var tampered = token[..^3] + (token.EndsWith("AAA") ? "BBB" : "AAA");

        var response = await ClientWithToken(tampered).GetAsync("/api/v1/companies");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task TokenSignedWithAnotherKey_IsRejected()
    {
        var foreign = new TokenService(Microsoft.Extensions.Options.Options.Create(new JwtOptions
        {
            SigningKey = "another-signing-key-another-signing-key-987654321"
        })).CreateToken("admin", JobHunterApiFactory.AdminPasswordHash);

        var response = await ClientWithToken(foreign.AccessToken).GetAsync("/api/v1/companies");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task GarbageBearerToken_IsRejected()
    {
        var response = await ClientWithToken("not.a.jwt").GetAsync("/api/v1/companies");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}

public sealed class LoginRateLimitTests : IClassFixture<RateLimitedApiFactory>
{
    private readonly HttpClient _client;

    public LoginRateLimitTests(RateLimitedApiFactory factory) => _client = factory.CreateClient();

    [Fact]
    public async Task Login_IsThrottledAfterTooManyAttempts()
    {
        var wrong = new LoginRequest("admin", "wrong password");

        for (var attempt = 0; attempt < 3; attempt++)
            Assert.Equal(HttpStatusCode.Unauthorized, (await _client.PostAsJsonAsync("/api/v1/auth/login", wrong)).StatusCode);

        var throttled = await _client.PostAsJsonAsync("/api/v1/auth/login", wrong);
        var evenWithCorrectPassword = await _client.PostAsJsonAsync("/api/v1/auth/login",
            new LoginRequest(JobHunterApiFactory.AdminUsername, JobHunterApiFactory.AdminPassword));

        Assert.Equal(HttpStatusCode.TooManyRequests, throttled.StatusCode);
        Assert.Equal(HttpStatusCode.TooManyRequests, evenWithCorrectPassword.StatusCode);
    }
}
