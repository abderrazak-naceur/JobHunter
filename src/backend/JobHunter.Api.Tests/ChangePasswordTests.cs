using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using JobHunter.Api.Contracts;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace JobHunter.Api.Tests;

/// <summary>
/// Changing the password changes the state of the database, so every test gets its own API instance.
/// </summary>
public sealed class ChangePasswordTests : IDisposable
{
    private const string Route = "/api/v1/auth/change-password";
    private const string NewPassword = "a brand new passphrase 42";

    private readonly JobHunterApiFactory _factory = new();
    private readonly HttpClient _signedIn;

    public ChangePasswordTests() => _signedIn = _factory.CreateAuthenticatedClient();

    public void Dispose() => _factory.Dispose();

    private static ChangePasswordRequest Valid() => new(JobHunterApiFactory.AdminPassword, NewPassword);

    private async Task<HttpStatusCode> LoginAsync(string password, string username = JobHunterApiFactory.AdminUsername) =>
        (await _factory.CreateClient().PostAsJsonAsync("/api/v1/auth/login", new LoginRequest(username, password))).StatusCode;

    private static async Task<JsonElement> ErrorsOf(HttpResponseMessage response) =>
        (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("errors");

    [Fact]
    public async Task RequiresTheAdminToken()
    {
        var response = await _factory.CreateClient().PostAsJsonAsync(Route, Valid());

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task WithTheWrongCurrentPassword_ReturnsBadRequest_NotUnauthorized_AndChangesNothing()
    {
        var response = await _signedIn.PostAsJsonAsync(Route, new ChangePasswordRequest("not my password", NewPassword));

        // 400 on purpose: the app signs the user out on 401, which would be wrong here.
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.True((await ErrorsOf(response)).TryGetProperty("CurrentPassword", out _));
        Assert.Equal(HttpStatusCode.OK, await LoginAsync(JobHunterApiFactory.AdminPassword));
        Assert.Equal(HttpStatusCode.Unauthorized, await LoginAsync(NewPassword));
    }

    public static TheoryData<string, string?> RefusedNewPasswords() => new()
    {
        { "short", "Too short1" },
        { "empty", "" },
        { "missing", null },
        { "same as current", JobHunterApiFactory.AdminPassword },
        { "same as username", JobHunterApiFactory.AdminUsername + "     " },
        { "too long", new string('x', 257) }
    };

    [Theory]
    [MemberData(nameof(RefusedNewPasswords))]
    public async Task RefusesWeakOrUnsuitableNewPasswords(string reason, string? candidate)
    {
        var response = await _signedIn.PostAsJsonAsync(Route, new ChangePasswordRequest(JobHunterApiFactory.AdminPassword, candidate));

        Assert.True(response.StatusCode == HttpStatusCode.BadRequest, $"'{reason}' should be refused.");
        Assert.True((await ErrorsOf(response)).TryGetProperty("NewPassword", out _));
        Assert.Equal(HttpStatusCode.OK, await LoginAsync(JobHunterApiFactory.AdminPassword));
    }

    [Fact]
    public async Task RefusesANewPasswordEqualToTheUsername_IgnoringCase()
    {
        // The test account is called "admin"; a 12+ character username would otherwise sneak through, so pad the check with the real rule.
        var response = await _signedIn.PostAsJsonAsync(Route, new ChangePasswordRequest(JobHunterApiFactory.AdminPassword, JobHunterApiFactory.AdminUsername.ToUpperInvariant()));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Succeeds_ReturnsAFreshToken_AndTheNewPasswordWorksFromNowOn()
    {
        var response = await _signedIn.PostAsJsonAsync(Route, Valid());
        var fresh = (await response.Content.ReadFromJsonAsync<LoginResponse>())!;

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.False(string.IsNullOrWhiteSpace(fresh.AccessToken));
        Assert.True(fresh.ExpiresAt > DateTimeOffset.UtcNow);
        Assert.Equal(HttpStatusCode.OK, await LoginAsync(NewPassword));
        Assert.Equal(HttpStatusCode.Unauthorized, await LoginAsync(JobHunterApiFactory.AdminPassword));
        Assert.Equal(HttpStatusCode.Unauthorized, await LoginAsync(NewPassword, username: "someone-else"));
    }

    [Fact]
    public async Task TheFreshTokenKeepsWorking_WhileEveryOlderTokenStops()
    {
        var oldToken = _signedIn.DefaultRequestHeaders.Authorization!.Parameter!;
        var response = await _signedIn.PostAsJsonAsync(Route, Valid());
        var freshToken = (await response.Content.ReadFromJsonAsync<LoginResponse>())!.AccessToken;

        HttpClient With(string token)
        {
            var client = _factory.CreateClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            return client;
        }

        Assert.Equal(HttpStatusCode.OK, (await With(freshToken).GetAsync("/api/v1/auth/me")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await With(oldToken).GetAsync("/api/v1/auth/me")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await With(oldToken).GetAsync("/api/v1/applications")).StatusCode);
    }

    [Fact]
    public async Task APasswordCanBeChangedMoreThanOnce()
    {
        var first = await _signedIn.PostAsJsonAsync(Route, Valid());
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", (await first.Content.ReadFromJsonAsync<LoginResponse>())!.AccessToken);

        var second = await client.PostAsJsonAsync(Route, new ChangePasswordRequest(NewPassword, "yet another passphrase 77"));

        Assert.Equal(HttpStatusCode.OK, second.StatusCode);
        Assert.Equal(HttpStatusCode.OK, await LoginAsync("yet another passphrase 77"));
        Assert.Equal(HttpStatusCode.Unauthorized, await LoginAsync(NewPassword));
    }

    [Fact]
    public async Task TheStoredPasswordIsHashed_NeverReadableFromTheDatabase()
    {
        await _signedIn.PostAsJsonAsync(Route, Valid());

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<JobHunter.Api.Infrastructure.JobHunterDbContext>();
        var row = await db.AdminAccounts.SingleAsync();

        Assert.StartsWith("pbkdf2-sha256$", row.PasswordHash);
        Assert.DoesNotContain(NewPassword, row.PasswordHash);
        Assert.Equal(JobHunterApiFactory.AdminUsername, row.Username);
    }
}

public sealed class ChangePasswordRateLimitTests : IClassFixture<RateLimitedApiFactory>
{
    private readonly RateLimitedApiFactory _factory;

    public ChangePasswordRateLimitTests(RateLimitedApiFactory factory) => _factory = factory;

    [Fact]
    public async Task GuessingTheCurrentPassword_IsThrottledLikeLoginAttempts()
    {
        var client = _factory.CreateAuthenticatedClient();
        var guess = new ChangePasswordRequest("wrong guess", "a brand new passphrase 42");

        for (var attempt = 0; attempt < 3; attempt++)
            Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/v1/auth/change-password", guess)).StatusCode);

        var throttled = await client.PostAsJsonAsync("/api/v1/auth/change-password",
            new ChangePasswordRequest(JobHunterApiFactory.AdminPassword, "a brand new passphrase 42"));

        Assert.Equal(HttpStatusCode.TooManyRequests, throttled.StatusCode);
    }
}
