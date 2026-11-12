namespace JobHunter.Api.Domain;

/// <summary>The stages of a job application, in the order they usually happen.</summary>
public static class ApplicationStatuses
{
    public const string Saved = "Saved";
    public const string Applied = "Applied";
    public const string Screening = "Screening";
    public const string Interview = "Interview";
    public const string Offer = "Offer";
    public const string Rejected = "Rejected";
    public const string Withdrawn = "Withdrawn";

    public static readonly IReadOnlyList<string> All = [Saved, Applied, Screening, Interview, Offer, Rejected, Withdrawn];

    /// <summary>Statuses after which there is nothing left to do.</summary>
    public static bool IsClosed(string status) => status is Rejected or Withdrawn;
}

/// <summary>A job the owner saved or applied for. Timestamps are UTC <see cref="DateTime"/>, which every database provider can sort.</summary>
public sealed class JobApplication
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Company { get; set; } = "";
    public string Role { get; set; } = "";
    public string Status { get; set; } = ApplicationStatuses.Saved;
    public string Source { get; set; } = "";
    public string Url { get; set; } = "";
    public string Location { get; set; } = "";
    public string SalaryRange { get; set; } = "";
    public string ContactName { get; set; } = "";
    public string ContactEmail { get; set; } = "";
    public DateOnly? AppliedOn { get; set; }
    public string NextStep { get; set; } = "";
    public DateOnly? NextStepOn { get; set; }
    public string Notes { get; set; } = "";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public List<ApplicationEvent> Events { get; set; } = [];
}

/// <summary>One step in the history of an application: it moved from one status to another.</summary>
public sealed class ApplicationEvent
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ApplicationId { get; set; }
    public DateTime At { get; set; } = DateTime.UtcNow;
    public string? FromStatus { get; set; }
    public string ToStatus { get; set; } = "";
}
