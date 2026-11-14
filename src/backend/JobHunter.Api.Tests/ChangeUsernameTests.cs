using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using JobHunter.Api.Contracts;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace JobHunter.Api.Tests;

/// <summary>Changing the username changes the state of the database, so every test gets its own API instance.</summary>
public sealed class ChangeUsernameTests : IDisposable
{
    private const string Route = "/api/v1/auth/change-username";
    private const string NewUsername = "abderrazak.naceur";

    private readonly JobHunterApiFactory _factory = new();
    private readonly HttpClient _signedIn;

    public ChangeUsernameTests() => _signedIn = _factory.CreateAuthenticatedClient();

    public void Dispose() => _factory.Dispose();

    private async Task<HttpStatusCode> LoginAsync(string username, string password = JobHunterApiFactory.AdminPassword) =>
        (await _factory.CreateClient().PostAsJsonAsync("/api/v1/auth/login", new LoginRequest(username, password))).StatusCode;

    private HttpClient ClientWithToken(string token)
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    [Fact]
    public async Task RequiresTheAdminToken()
    {
        var response = await _factory.CreateClient().PostAsJsonAsync(Route, new ChangeUsernameRequest(JobHunterApiFactory.AdminPassword, NewUsername));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Me_ShowsTheCurrentUsername()
    {
        var me = await _signedIn.GetFromJsonAsync<CurrentUserResponse>("/api/v1/auth/me");

        Assert.Equal(JobHunterApiFactory.AdminUsername, me!.Username);
    }

    [Fact]
    public async Task AfterTheChange_TheNewUsernameLogsIn_TheOldOneNoLonger_AndThePasswordStaysTheSame()
    {
        var response = await _signedIn.PostAsJsonAsync(Route, new ChangeUsernameRequest(JobHunterApiFactory.AdminPassword, $"  {NewUsername}  "));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(HttpStatusCode.OK, await LoginAsync(NewUsername));
        Assert.Equal(HttpStatusCode.Unauthorized, await LoginAsync(JobHunterApiFactory.AdminUsername));
    }

    [Fact]
    public async Task TheFreshTokenShowsTheNewUsername_WhileEveryOlderTokenStops()
    {
        var oldToken = _signedIn.DefaultRequestHeaders.Authorization!.Parameter!;

        var response = await _signedIn.PostAsJsonAsync(Route, new ChangeUsernameRequest(JobHunterApiFactory.AdminPassword, NewUsername));
        var fresh = await response.Content.ReadFromJsonAsync<LoginResponse>();

        Assert.Equal(HttpStatusCode.Unauthorized, (await ClientWithToken(oldToken).GetAsync("/api/v1/auth/me")).StatusCode);
        var me = await ClientWithToken(fresh!.AccessToken).GetFromJsonAsync<CurrentUserResponse>("/api/v1/auth/me");
        Assert.Equal(NewUsername, me!.Username);
    }

    [Fact]
    public async Task StoresTheUsernameInTheDatabase_KeepingTheConfiguredPasswordHash()
    {
        await _signedIn.PostAsJsonAsync(Route, new ChangeUsernameRequest(JobHunterApiFactory.AdminPassword, NewUsername));

        using var scope = _factory.Services.CreateScope();
        var row = await scope.ServiceProvider.GetRequiredService<Infrastructure.JobHunterDbContext>().AdminAccounts.SingleAsync();
        Assert.Equal(NewUsername, row.Username);
        Assert.Equal(JobHunterApiFactory.AdminPasswordHash, row.PasswordHash);
    }

    [Fact]
    public async Task UsernameAndPasswordCanBothBeChanged_OneAfterTheOther()
    {
        var renamed = await (await _signedIn.PostAsJsonAsync(Route, new ChangeUsernameRequest(JobHunterApiFactory.AdminPassword, NewUsername)))
            .Content.ReadFromJsonAsync<LoginResponse>();
        var client = ClientWithToken(renamed!.AccessToken);

        var passwordChange = await client.PostAsJsonAsync("/api/v1/auth/change-password",
            new ChangePasswordRequest(JobHunterApiFactory.AdminPassword, "a brand new passphrase 42"));

        Assert.Equal(HttpStatusCode.OK, passwordChange.StatusCode);
        Assert.Equal(HttpStatusCode.OK, await LoginAsync(NewUsername, "a brand new passphrase 42"));
    }

    [Fact]
    public async Task WithTheWrongCurrentPassword_ReturnsBadRequest_AndChangesNothing()
    {
        var response = await _signedIn.PostAsJsonAsync(Route, new ChangeUsernameRequest("not my password", NewUsername));
        var errors = (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("errors");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.True(errors.TryGetProperty("CurrentPassword", out _));
        Assert.Equal(HttpStatusCode.OK, await LoginAsync(JobHunterApiFactory.AdminUsername));
    }

    public static TheoryData<string, string?> RefusedUsernames() => new()
    {
        { "missing", null },
        { "too short", "ab" },
        { "too long", new string('a', 101) },
        { "with spaces", "zak naceur" },
        { "with symbols", "zak<script>" },
        { "same as current", JobHunterApiFactory.AdminUsername }
    };

    [Theory]
    [MemberData(nameof(RefusedUsernames))]
    public async Task RefusesUnsuitableUsernames(string reason, string? candidate)
    {
        var response = await _signedIn.PostAsJsonAsync(Route, new ChangeUsernameRequest(JobHunterApiFactory.AdminPassword, candidate));

        Assert.True(response.StatusCode == HttpStatusCode.BadRequest, $"'{reason}' should be refused.");
        Assert.Equal(HttpStatusCode.OK, await LoginAsync(JobHunterApiFactory.AdminUsername));
    }

    [Theory]
    [InlineData("zak_naceur")]
    [InlineData("zak.naceur@example.com")]
    [InlineData("Abderrazak-N")]
    [InlineData("zaknaceur2026")]
    public async Task AcceptsCommonUsernameShapes(string candidate)
    {
        var response = await _signedIn.PostAsJsonAsync(Route, new ChangeUsernameRequest(JobHunterApiFactory.AdminPassword, candidate));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(HttpStatusCode.OK, await LoginAsync(candidate));
    }
}
