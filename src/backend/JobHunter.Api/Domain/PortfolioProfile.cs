namespace JobHunter.Api.Domain;

/// <summary>
/// The content of the public portfolio page. There is exactly one row (<see cref="SingletonId"/>).
/// The sections are stored as one JSON document: they are always read and written together
/// and never queried individually.
/// </summary>
public sealed class PortfolioProfile
{
    public static readonly Guid SingletonId = new("00000000-0000-0000-0000-000000000001");

    public Guid Id { get; set; } = SingletonId;
    public string ContentJson { get; set; } = "{}";
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
