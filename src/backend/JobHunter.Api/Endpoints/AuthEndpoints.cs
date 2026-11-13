using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using JobHunter.Api.Contracts;
using JobHunter.Api.Infrastructure.Auth;
using Microsoft.Extensions.Options;

namespace JobHunter.Api.Endpoints;

public static partial class AuthEndpoints
{
    public const string LoginRateLimitPolicy = "login";
    public const int MinPasswordLength = 12;
    public const int MaxPasswordLength = 256;
    public const int MinUsernameLength = 3;
    public const int MaxUsernameLength = 100;

    public static IEndpointRouteBuilder MapAuthEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/v1/auth").WithTags("Auth");

        group.MapPost("/login", async (
            LoginRequest request,
            AdminAccountStore accounts,
            TokenService tokens,
            CancellationToken cancellationToken) =>
        {
            var errors = new Dictionary<string, string[]>();
            if (string.IsNullOrWhiteSpace(request.Username) || request.Username.Length > 100)
                errors[nameof(request.Username)] = ["Inserisci lo username."];
            if (string.IsNullOrEmpty(request.Password) || request.Password.Length > MaxPasswordLength)
                errors[nameof(request.Password)] = ["Inserisci la password."];
            if (errors.Count > 0) return Results.ValidationProblem(errors);

            var admin = await accounts.GetAsync(cancellationToken);

            // Always verify the password hash and compare the username in constant time, so a wrong
            // username and a wrong password take the same time and give the same answer.
            var passwordOk = PasswordHasher.Verify(request.Password!, admin.PasswordHash);
            var usernameOk = CryptographicOperations.FixedTimeEquals(
                SHA256.HashData(Encoding.UTF8.GetBytes(request.Username!.Trim())),
                SHA256.HashData(Encoding.UTF8.GetBytes(admin.Username)));

            if (!passwordOk || !usernameOk)
                return Results.Json(new { message = "Credenziali non valide." }, statusCode: StatusCodes.Status401Unauthorized);

            var token = tokens.CreateToken(admin.Username, admin.PasswordHash);
            return Results.Ok(new LoginResponse(token.AccessToken, token.ExpiresAt));
        })
        .AllowAnonymous()
        .RequireRateLimiting(LoginRateLimitPolicy);

        group.MapGet("/me", (ClaimsPrincipal user) =>
            Results.Ok(new CurrentUserResponse(user.Identity?.Name ?? "")))
            .RequireAuthorization();

        // A wrong current password answers 400 (not 401), so the app does not mistake it for an expired session.
        // It shares the login rate limit: the current password cannot be guessed by retrying.
        group.MapPost("/change-password", async (
            ChangePasswordRequest request,
            ClaimsPrincipal user,
            AdminAccountStore accounts,
            TokenService tokens,
            IOptions<AdminOptions> adminOptions,
            CancellationToken cancellationToken) =>
        {
            var admin = await accounts.GetAsync(cancellationToken);
            var errors = new Dictionary<string, string[]>();

            if (string.IsNullOrEmpty(request.CurrentPassword))
                errors[nameof(request.CurrentPassword)] = ["Inserisci la password attuale."];
            else if (!PasswordHasher.Verify(request.CurrentPassword, admin.PasswordHash))
                errors[nameof(request.CurrentPassword)] = ["La password attuale non è corretta."];

            var newPassword = request.NewPassword ?? "";
            if (newPassword.Length < MinPasswordLength || newPassword.Length > MaxPasswordLength)
                errors[nameof(request.NewPassword)] = [$"La nuova password deve avere da {MinPasswordLength} a {MaxPasswordLength} caratteri."];
            else if (newPassword == request.CurrentPassword)
                errors[nameof(request.NewPassword)] = ["La nuova password deve essere diversa da quella attuale."];
            else if (string.Equals(newPassword, admin.Username, StringComparison.OrdinalIgnoreCase))
                errors[nameof(request.NewPassword)] = ["La password non può coincidere con lo username."];

            if (errors.Count > 0) return Results.ValidationProblem(errors);

            var hash = PasswordHasher.Hash(newPassword, adminOptions.Value.HashIterations);
            await accounts.SetPasswordAsync(admin.Username, hash, cancellationToken);

            // Every older token stops working; this response carries the fresh one for the current session.
            var token = tokens.CreateToken(admin.Username, hash);
            return Results.Ok(new LoginResponse(token.AccessToken, token.ExpiresAt));
        })
        .RequireAuthorization()
        .RequireRateLimiting(LoginRateLimitPolicy);

        // Same rules as the password change: the current password is required (400 if wrong), the login rate limit
        // applies, every other session is closed and the response carries a fresh token.
        group.MapPost("/change-username", async (
            ChangeUsernameRequest request,
            AdminAccountStore accounts,
            TokenService tokens,
            CancellationToken cancellationToken) =>
        {
            var admin = await accounts.GetAsync(cancellationToken);
            var errors = new Dictionary<string, string[]>();

            if (string.IsNullOrEmpty(request.CurrentPassword))
                errors[nameof(request.CurrentPassword)] = ["Inserisci la password attuale."];
            else if (!PasswordHasher.Verify(request.CurrentPassword, admin.PasswordHash))
                errors[nameof(request.CurrentPassword)] = ["La password attuale non è corretta."];

            var newUsername = request.NewUsername?.Trim() ?? "";
            if (newUsername.Length < MinUsernameLength || newUsername.Length > MaxUsernameLength)
                errors[nameof(request.NewUsername)] = [$"Lo username deve avere da {MinUsernameLength} a {MaxUsernameLength} caratteri."];
            else if (!UsernameCharacters().IsMatch(newUsername))
                errors[nameof(request.NewUsername)] = ["Usa solo lettere, numeri e i caratteri . _ - @ (senza spazi)."];
            else if (newUsername == admin.Username)
                errors[nameof(request.NewUsername)] = ["Il nuovo username è uguale a quello attuale."];
            else if (string.Equals(newUsername, request.CurrentPassword, StringComparison.OrdinalIgnoreCase))
                errors[nameof(request.NewUsername)] = ["Lo username non può coincidere con la password."];

            if (errors.Count > 0) return Results.ValidationProblem(errors);

            await accounts.SetUsernameAsync(newUsername, admin.PasswordHash, cancellationToken);

            var token = tokens.CreateToken(newUsername, admin.PasswordHash);
            return Results.Ok(new LoginResponse(token.AccessToken, token.ExpiresAt));
        })
        .RequireAuthorization()
        .RequireRateLimiting(LoginRateLimitPolicy);

        return endpoints;
    }

    [GeneratedRegex(@"^[\p{L}\p{N}._@-]+$", RegexOptions.None, 1000)]
    private static partial Regex UsernameCharacters();
}