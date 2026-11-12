using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace JobHunter.Api.Infrastructure.Auth;

public sealed record IssuedToken(string AccessToken, DateTimeOffset ExpiresAt);

/// <summary>Issues and describes the HS256 JWT used by the admin area.</summary>
public sealed class TokenService(IOptions<JwtOptions> options)
{
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

    public IssuedToken CreateToken(string username, TimeSpan? lifetime = null, DateTimeOffset? now = null)
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
            Subject = new ClaimsIdentity([new Claim(ClaimTypes.Name, username)]),
            SigningCredentials = new SigningCredentials(CreateKey(_options), SecurityAlgorithms.HmacSha256)
        };

        return new IssuedToken(new JsonWebTokenHandler().CreateToken(descriptor), expiresAt);
    }
}
