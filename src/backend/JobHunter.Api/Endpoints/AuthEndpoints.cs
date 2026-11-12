using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using JobHunter.Api.Contracts;
using JobHunter.Api.Infrastructure.Auth;
using Microsoft.Extensions.Options;

namespace JobHunter.Api.Endpoints;

public static class AuthEndpoints
{
    public const string LoginRateLimitPolicy = "login";

    public static IEndpointRouteBuilder MapAuthEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/v1/auth").WithTags("Auth");

        group.MapPost("/login", (
            LoginRequest request,
            IOptions<AdminOptions> adminOptions,
            TokenService tokens) =>
        {
            var errors = new Dictionary<string, string[]>();
            if (string.IsNullOrWhiteSpace(request.Username) || request.Username.Length > 100)
                errors[nameof(request.Username)] = ["Inserisci lo username."];
            if (string.IsNullOrEmpty(request.Password) || request.Password.Length > 256)
                errors[nameof(request.Password)] = ["Inserisci la password."];
            if (errors.Count > 0) return Results.ValidationProblem(errors);

            var admin = adminOptions.Value;

            // Always verify the password hash and compare the username in constant time, so a wrong
            // username and a wrong password take the same time and give the same answer.
            var passwordOk = PasswordHasher.Verify(request.Password!, admin.PasswordHash);
            var usernameOk = CryptographicOperations.FixedTimeEquals(
                SHA256.HashData(Encoding.UTF8.GetBytes(request.Username!.Trim())),
                SHA256.HashData(Encoding.UTF8.GetBytes(admin.Username)));

            if (!passwordOk || !usernameOk)
                return Results.Json(new { message = "Credenziali non valide." }, statusCode: StatusCodes.Status401Unauthorized);

            var token = tokens.CreateToken(admin.Username);
            return Results.Ok(new LoginResponse(token.AccessToken, token.ExpiresAt));
        })
        .AllowAnonymous()
        .RequireRateLimiting(LoginRateLimitPolicy);

        group.MapGet("/me", (ClaimsPrincipal user) =>
            Results.Ok(new CurrentUserResponse(user.Identity?.Name ?? "")))
            .RequireAuthorization();

        return endpoints;
    }
}
