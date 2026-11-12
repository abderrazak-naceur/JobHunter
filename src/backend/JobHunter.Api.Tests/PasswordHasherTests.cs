using JobHunter.Api.Infrastructure.Auth;

namespace JobHunter.Api.Tests;

public sealed class PasswordHasherTests
{
    [Fact]
    public void Verify_AcceptsTheOriginalPassword()
    {
        var hash = PasswordHasher.Hash("a long enough password", iterations: 1_000);

        Assert.True(PasswordHasher.Verify("a long enough password", hash));
    }

    [Fact]
    public void Verify_RejectsAWrongPassword()
    {
        var hash = PasswordHasher.Hash("a long enough password", iterations: 1_000);

        Assert.False(PasswordHasher.Verify("A long enough password", hash));
        Assert.False(PasswordHasher.Verify("", hash));
    }

    [Fact]
    public void Hash_UsesARandomSaltEveryTime()
    {
        Assert.NotEqual(PasswordHasher.Hash("same password", 1_000), PasswordHasher.Hash("same password", 1_000));
    }

    [Fact]
    public void Hash_DoesNotContainThePlainPassword()
    {
        Assert.DoesNotContain("same password", PasswordHasher.Hash("same password", 1_000));
    }

    [Theory]
    [InlineData("")]
    [InlineData("plain-text-password")]
    [InlineData("pbkdf2-sha256$abc$AAAA$AAAA")]
    [InlineData("pbkdf2-sha256$1000$not-base64!$AAAA")]
    [InlineData("pbkdf2-sha256$0$AAAA$AAAA")]
    [InlineData("other-algo$1000$AAAA$AAAA")]
    [InlineData("pbkdf2-sha256$1000$$")]
    public void Verify_ReturnsFalseForMalformedHashes(string storedHash)
    {
        Assert.False(PasswordHasher.Verify("whatever", storedHash));
    }
}
