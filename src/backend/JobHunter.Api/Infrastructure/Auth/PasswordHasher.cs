using System.Security.Cryptography;

namespace JobHunter.Api.Infrastructure.Auth;

/// <summary>PBKDF2-SHA256 password hashing. Format: <c>pbkdf2-sha256$iterations$salt$hash</c> (base64 parts).</summary>
public static class PasswordHasher
{
    private const string Prefix = "pbkdf2-sha256";
    private const int SaltSize = 16;
    private const int KeySize = 32;
    public const int DefaultIterations = 600_000;

    public static string Hash(string password, int iterations = DefaultIterations)
    {
        ArgumentException.ThrowIfNullOrEmpty(password);
        ArgumentOutOfRangeException.ThrowIfLessThan(iterations, 1);

        var salt = RandomNumberGenerator.GetBytes(SaltSize);
        var key = Rfc2898DeriveBytes.Pbkdf2(password, salt, iterations, HashAlgorithmName.SHA256, KeySize);
        return $"{Prefix}${iterations}${Convert.ToBase64String(salt)}${Convert.ToBase64String(key)}";
    }

    /// <summary>Returns false (never throws) for wrong passwords and for malformed stored hashes.</summary>
    public static bool Verify(string password, string storedHash)
    {
        var parts = storedHash.Split('$');
        if (parts.Length != 4 || parts[0] != Prefix || !int.TryParse(parts[1], out var iterations) || iterations < 1)
            return false;

        byte[] salt, expected;
        try
        {
            salt = Convert.FromBase64String(parts[2]);
            expected = Convert.FromBase64String(parts[3]);
        }
        catch (FormatException)
        {
            return false;
        }

        if (salt.Length == 0 || expected.Length == 0) return false;

        var actual = Rfc2898DeriveBytes.Pbkdf2(password, salt, iterations, HashAlgorithmName.SHA256, expected.Length);
        return CryptographicOperations.FixedTimeEquals(actual, expected);
    }
}
