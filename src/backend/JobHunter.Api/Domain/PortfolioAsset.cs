namespace JobHunter.Api.Domain;

/// <summary>
/// A binary file shown on the public portfolio (profile photo or CV). It lives in the
/// database because the disk of most hosting platforms is ephemeral.
/// </summary>
public sealed class PortfolioAsset
{
    public const string PhotoKind = "photo";
    public const string CvKind = "cv";

    /// <summary>One row per kind; also the primary key.</summary>
    public string Kind { get; set; } = "";
    public string ContentType { get; set; } = "";
    public byte[] Data { get; set; } = [];
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
