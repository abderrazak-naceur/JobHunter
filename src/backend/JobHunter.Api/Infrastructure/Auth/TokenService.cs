using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace JobHunter.Api.Infrastructure.Auth;

public sealed record IssuedToken(string AccessToken, DateTimeOffset ExpiresAt);

/// <summary>
/// A short, non-reversible fingerprint of a password hash. Every token carries the fingerprint of the password it was
/// issued for, so changing the password invalidates all older tokens at once, with no clock involved.
/// </summary>
public static class PasswordFingerprint
{
    public static string Of(string passwordHash) =>
        Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(Encoding.UTF8.GetBytes(passwordHash)))[..16];
}

/// <summary>Issues and describes the HS256 JWT used by the admin area.</summary>
public sealed class TokenService(IOptions<JwtOptions> options)
{
    public const string PasswordClaim = "pwd";

    private readonly JwtOptions _options = options.Value;

    public static SymmetricSecurityKey CreateKey(JwtOptions options) => new(Encoding.UTF8.GetBytes(options.SigningKey));

    public static TokenValidationParameters CreateValidationParameters(JwtOptions options) => new()
    {
        ValidateIssuer = true,
        ValidIssuer = options.Issuer,
        ValidateAudience = true,
        ValidAudience = options.Audience,
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = CreateKey(options),
        ValidAlgorithms = [SecurityAlgorithms.HmacSha256],
        ValidateLifetime = true,
        RequireExpirationTime = true,
        ClockSkew = TimeSpan.FromSeconds(30),
        NameClaimType = ClaimTypes.Name
    };

    public IssuedToken CreateToken(string username, string passwordHash, TimeSpan? lifetime = null, DateTimeOffset? now = null)
    {
        var issuedAt = now ?? DateTimeOffset.UtcNow;
        var expiresAt = issuedAt + (lifetime ?? TimeSpan.FromMinutes(_options.ExpiryMinutes));

        var descriptor = new SecurityTokenDescriptor
        {
            Issuer = _options.Issuer,
            Audience = _options.Audience,
            IssuedAt = issuedAt.UtcDateTime,
            NotBefore = issuedAt.UtcDateTime,
            Expires = expiresAt.UtcDateTime,
            Subject = new ClaimsIdentity([new Claim(ClaimTypes.Name, username), new Claim(PasswordClaim, PasswordFingerprint.Of(passwordHash))]),
            SigningCredentials = new SigningCredentials(CreateKey(_options), SecurityAlgorithms.HmacSha256)
        };

        return new IssuedToken(new JsonWebTokenHandler().CreateToken(descriptor), expiresAt);
    }
}
