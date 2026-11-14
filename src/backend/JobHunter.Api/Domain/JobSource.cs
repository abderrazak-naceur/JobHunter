namespace JobHunter.Api.Domain;

/// <summary>A public company job board that can be queried through a documented provider API.</summary>
public sealed class JobSource
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string CompanyName { get; set; } = string.Empty;
    public string Provider { get; set; } = string.Empty;
    public string BoardIdentifier { get; set; } = string.Empty;
    public string CareersUrl { get; set; } = string.Empty;
    public bool IsEnabled { get; set; } = true;
    public DateTimeOffset? LastCheckedAt { get; set; }
    public DateTimeOffset? LastSuccessfulAt { get; set; }
    public string LastError { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
