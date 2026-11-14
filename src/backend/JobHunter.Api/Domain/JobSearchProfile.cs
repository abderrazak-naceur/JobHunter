namespace JobHunter.Api.Domain;

public sealed class JobSearchProfile
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = "Ricerca principale";
    public string RoleKeywords { get; set; } = string.Empty;
    public string SkillKeywords { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public decimal? MinimumAnnualSalary { get; set; }
    public string WorkMode { get; set; } = "RemoteOrHybrid";
    public int MinimumMatchScore { get; set; } = 35;
    public bool IsActive { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
