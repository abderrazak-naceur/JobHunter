namespace JobHunter.Api.Domain;

/// <summary>How the owner knows a contact. Kept as plain text in the database so adding a kind never needs a migration.</summary>
public static class ContactKinds
{
    public const string Recruiter = "Recruiter";
    public const string Referral = "Referral";
    public const string Colleague = "Colleague";
    public const string Other = "Other";

    public static readonly IReadOnlyList<string> All = [Recruiter, Referral, Colleague, Other];
}

/// <summary>A person met during the job search: recruiter, referral, former colleague... Dates are UTC <see cref="DateTime"/>.</summary>
public sealed class Contact
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = "";
    public string Kind { get; set; } = ContactKinds.Recruiter;
    public string Company { get; set; } = "";
    public string Role { get; set; } = "";
    public string Email { get; set; } = "";
    public string Phone { get; set; } = "";
    public string ProfileUrl { get; set; } = "";
    public string Notes { get; set; } = "";
    public DateOnly? LastContactOn { get; set; }
    public DateOnly? NextFollowUpOn { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}