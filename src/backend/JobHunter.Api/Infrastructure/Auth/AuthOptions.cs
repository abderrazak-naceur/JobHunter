using System.ComponentModel.DataAnnotations;

namespace JobHunter.Api.Infrastructure.Auth;

/// <summary>The single admin account. The password is stored only as a PBKDF2 hash.</summary>
public sealed class AdminOptions
{
    public const string SectionName = "Admin";

    [Required, MinLength(3), MaxLength(100)]
    public string Username { get; set; } = "";

    /// <summary>Generate with <c>dotnet run --project src/backend/JobHunter.Api -- hash-password</c>.</summary>
    [Required]
    public string PasswordHash { get; set; } = "";

    /// <summary>Work factor for the hash of a password changed from the app (the configured hash carries its own).</summary>
    [Range(1000, 10_000_000)]
    public int HashIterations { get; set; } = PasswordHasher.DefaultIterations;
}

public sealed class JwtOptions
{
    public const string SectionName = "Jwt";

    [Required, MinLength(32, ErrorMessage = "Jwt:SigningKey must be at least 32 characters long.")]
    public string SigningKey { get; set; } = "";

    [Required]
    public string Issuer { get; set; } = "portfolio-api";

    [Required]
    public string Audience { get; set; } = "portfolio-admin";

    [Range(5, 24 * 60)]
    public int ExpiryMinutes { get; set; } = 8 * 60;
}

public sealed class LoginRateLimitOptions
{
    public const string SectionName = "RateLimiting";

    /// <summary>Maximum login attempts per client IP per minute.</summary>
    [Range(1, 100000)]
    public int LoginPermitLimit { get; set; } = 5;

    /// <summary>Maximum job postings read from a link or text per client IP per minute.</summary>
    [Range(1, 100000)]
    public int ImportPermitLimit { get; set; } = 20;
}
