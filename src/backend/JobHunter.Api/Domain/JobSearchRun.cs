namespace JobHunter.Api.Domain;

public sealed class JobSearchRun
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public DateTimeOffset StartedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? CompletedAt { get; set; }
    public string Status { get; set; } = "Running";
    public int FoundCount { get; set; }
    public int NewCount { get; set; }
    public int UpdatedCount { get; set; }
    public int ErrorCount { get; set; }
    public string Summary { get; set; } = string.Empty;
}
