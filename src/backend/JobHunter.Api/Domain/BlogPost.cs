namespace JobHunter.Api.Domain;

public sealed class BlogPost
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Title { get; set; } = "";
    public string Slug { get; set; } = "";
    public string Excerpt { get; set; } = "";
    public string ContentMarkdown { get; set; } = "";
    public string Category { get; set; } = "";
    public string TagsJson { get; set; } = "[]";
    public string? CoverImageUrl { get; set; }
    public string? SeoTitle { get; set; }
    public string? SeoDescription { get; set; }
    public string Status { get; set; } = "Draft";
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? PublishedAt { get; set; }
}
