using JobHunter.Api.Domain;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace JobHunter.Api.Infrastructure.Auth;

/// <summary>The credentials the login checks, and when the password last changed (null if never changed in the app).</summary>
public sealed record AdminCredentials(string Username, string PasswordHash, DateTime? PasswordChangedAt);

/// <summary>Reads and updates the admin credentials: the database after a password change, configuration before.</summary>
public sealed class AdminAccountStore(JobHunterDbContext db, IOptions<AdminOptions> options)
{
    public async Task<AdminCredentials> GetAsync(CancellationToken cancellationToken)
    {
        var account = await db.AdminAccounts.AsNoTracking().FirstOrDefaultAsync(x => x.Id == AdminAccount.SingletonId, cancellationToken);
        if (account is null)
            return new AdminCredentials(options.Value.Username, options.Value.PasswordHash, null);

        // Some providers hand back dates without a kind; they are always stored as UTC.
        return new AdminCredentials(account.Username, account.PasswordHash, DateTime.SpecifyKind(account.PasswordChangedAt, DateTimeKind.Utc));
    }

    /// <summary>Stores the new password hash and returns the moment from which older tokens stop working.</summary>
    public async Task<DateTime> SetPasswordAsync(string username, string passwordHash, CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var changedAt = new DateTime(now.Ticks - now.Ticks % TimeSpan.TicksPerSecond, DateTimeKind.Utc); // tokens carry whole seconds

        var account = await db.AdminAccounts.FirstOrDefaultAsync(x => x.Id == AdminAccount.SingletonId, cancellationToken);
        if (account is null)
        {
            account = new AdminAccount();
            db.AdminAccounts.Add(account);
        }

        account.Username = username;
        account.PasswordHash = passwordHash;
        account.PasswordChangedAt = changedAt;
        await db.SaveChangesAsync(cancellationToken);
        return changedAt;
    }
}

/// <summary>
/// Accepts a token only if it was issued for the current password (see <see cref="PasswordFingerprint"/>), so after a
/// password change every older token, including a stolen one, stops working at once.
/// </summary>
public static class PasswordChangeTokenCheck
{
    public static async Task ValidateAsync(TokenValidatedContext context)
    {
        var store = context.HttpContext.RequestServices.GetRequiredService<AdminAccountStore>();
        var credentials = await store.GetAsync(context.HttpContext.RequestAborted);

        var claim = context.Principal?.FindFirst(TokenService.PasswordClaim)?.Value;
        if (claim is null || claim != PasswordFingerprint.Of(credentials.PasswordHash))
            context.Fail("The token was not issued for the current password.");
    }
}