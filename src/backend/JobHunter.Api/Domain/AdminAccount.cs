namespace JobHunter.Api.Domain;

/// <summary>
/// The admin login once the password has been changed from the app. There is at most one row
/// (<see cref="SingletonId"/>). While there is none, the credentials come from configuration
/// (<c>Admin:Username</c> and <c>Admin:PasswordHash</c>); once the row exists it takes over completely.
/// </summary>
public sealed class AdminAccount
{
    public static readonly Guid SingletonId = new("00000000-0000-0000-0000-0000000000a1");

    public Guid Id { get; set; } = SingletonId;
    public string Username { get; set; } = "";
    public string PasswordHash { get; set; } = "";

    /// <summary>Tokens issued before this moment are no longer accepted. Always a whole second, in UTC.</summary>
    public DateTime PasswordChangedAt { get; set; } = DateTime.UtcNow;
}
