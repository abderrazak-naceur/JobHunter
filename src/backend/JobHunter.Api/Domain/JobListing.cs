namespace JobHunter.Api.Domain;

/// <summary>A normalized public vacancy. Publication and discovery timestamps are deliberately separate.</summary>
public sealed class JobListing
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid JobSourceId { get; set; }
    public string ExternalId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string CompanyName { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public string WorkMode { get; set; } = string.Empty;
    public string SalaryText { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string SourceUrl { get; set; } = string.Empty;
    public string ApplyUrl { get; set; } = string.Empty;
    public DateTimeOffset? PublishedAt { get; set; }
    public DateTimeOffset? SourceUpdatedAt { get; set; }
    public DateTimeOffset FirstSeenAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset LastSeenAt { get; set; } = DateTimeOffset.UtcNow;
}
