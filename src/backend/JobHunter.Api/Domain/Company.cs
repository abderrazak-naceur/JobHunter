namespace JobHunter.Api.Domain;

public sealed class Company
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string Website { get; set; } = string.Empty;
    public string CareersUrl { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public string Sector { get; set; } = string.Empty;
    public string Technologies { get; set; } = string.Empty;
    public string Priority { get; set; } = "Media";
    public string Notes { get; set; } = string.Empty;
    public bool Followed { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
