using System.Text.Json;
using System.Text.RegularExpressions;
using JobHunter.Api.Domain;
using JobHunter.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace JobHunter.Api.Endpoints;

public sealed record BlogPostRequest(
    string Title,
    string Slug,
    string Excerpt,
    string ContentMarkdown,
    string Category,
    IReadOnlyList<string>? Tags,
    string? CoverImageUrl,
    string? SeoTitle,
    string? SeoDescription,
    string Status);

public sealed record BlogPostResponse(
    Guid Id, string Title, string Slug, string Excerpt, string ContentMarkdown,
    string Category, IReadOnlyList<string> Tags, string? CoverImageUrl,
    string? SeoTitle, string? SeoDescription, string Status,
    DateTimeOffset CreatedAt, DateTimeOffset UpdatedAt, DateTimeOffset? PublishedAt);

public static partial class BlogEndpoints
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public static IEndpointRouteBuilder MapBlogEndpoints(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapGet("/api/v1/blog", async (int? page, int? pageSize, string? category,
            JobHunterDbContext db, CancellationToken ct) =>
        {
            var currentPage = Math.Max(1, page ?? 1);
            var size = Math.Clamp(pageSize ?? 9, 1, 30);
            var query = db.BlogPosts.AsNoTracking().Where(x => x.Status == "Published" && x.PublishedAt <= DateTimeOffset.UtcNow);
            if (!string.IsNullOrWhiteSpace(category))
                query = query.Where(x => x.Category == category.Trim());
            var total = await query.CountAsync(ct);
            var posts = await query.OrderByDescending(x => x.PublishedAt)
                .Skip((currentPage - 1) * size).Take(size).ToListAsync(ct);
            return Results.Ok(new { items = posts.Select(ToResponse), page = currentPage, pageSize = size, total });
        }).AllowAnonymous().WithTags("Blog");

        endpoints.MapGet("/api/v1/blog/{slug}", async (string slug, JobHunterDbContext db, CancellationToken ct) =>
        {
            var post = await db.BlogPosts.AsNoTracking()
                .FirstOrDefaultAsync(x => x.Slug == slug && x.Status == "Published" && x.PublishedAt <= DateTimeOffset.UtcNow, ct);
            return post is null ? Results.NotFound() : Results.Ok(ToResponse(post));
        }).AllowAnonymous().WithTags("Blog");

        endpoints.MapGet("/api/v1/admin/blog", async (JobHunterDbContext db, CancellationToken ct) =>
        {
            var posts = await db.BlogPosts.AsNoTracking().OrderByDescending(x => x.UpdatedAt).ToListAsync(ct);
            return Results.Ok(posts.Select(ToResponse));
        }).RequireAuthorization().WithTags("Blog Admin");

        endpoints.MapPost("/api/v1/admin/blog", async (BlogPostRequest request, JobHunterDbContext db, CancellationToken ct) =>
        {
            var errors = Validate(request);
            if (errors.Count > 0) return Results.ValidationProblem(errors);
            var slug = NormalizeSlug(request.Slug);
            if (slug.Length == 0) return Results.ValidationProblem(new Dictionary<string, string[]> { ["slug"] = ["Lo slug deve contenere lettere o numeri."] });
            if (await db.BlogPosts.AnyAsync(x => x.Slug == slug, ct))
                return Results.Conflict(new { title = "Questo slug è già utilizzato." });
            var post = new BlogPost();
            Apply(post, request, slug);
            db.BlogPosts.Add(post);
            await db.SaveChangesAsync(ct);
            return Results.Created($"/api/v1/blog/{post.Slug}", ToResponse(post));
        }).RequireAuthorization().WithTags("Blog Admin");

        endpoints.MapPut("/api/v1/admin/blog/{id:guid}", async (Guid id, BlogPostRequest request, JobHunterDbContext db, CancellationToken ct) =>
        {
            var errors = Validate(request);
            if (errors.Count > 0) return Results.ValidationProblem(errors);
            var post = await db.BlogPosts.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (post is null) return Results.NotFound();
            var slug = NormalizeSlug(request.Slug);
            if (slug.Length == 0) return Results.ValidationProblem(new Dictionary<string, string[]> { ["slug"] = ["Lo slug deve contenere lettere o numeri."] });
            if (await db.BlogPosts.AnyAsync(x => x.Id != id && x.Slug == slug, ct))
                return Results.Conflict(new { title = "Questo slug è già utilizzato." });
            Apply(post, request, slug);
            await db.SaveChangesAsync(ct);
            return Results.Ok(ToResponse(post));
        }).RequireAuthorization().WithTags("Blog Admin");

        endpoints.MapDelete("/api/v1/admin/blog/{id:guid}", async (Guid id, JobHunterDbContext db, CancellationToken ct) =>
        {
            var post = await db.BlogPosts.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (post is null) return Results.NotFound();
            db.BlogPosts.Remove(post);
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        }).RequireAuthorization().WithTags("Blog Admin");

        return endpoints;
    }

    private static Dictionary<string, string[]> Validate(BlogPostRequest request)
    {
        var errors = new Dictionary<string, string[]>();
        void Required(string key, string? value, int max) {
            if (string.IsNullOrWhiteSpace(value)) errors[key] = ["Campo obbligatorio."];
            else if (value.Trim().Length > max) errors[key] = [$"Massimo {max} caratteri."];
        }
        Required("title", request.Title, 180);
        Required("slug", request.Slug, 180);
        Required("excerpt", request.Excerpt, 500);
        Required("contentMarkdown", request.ContentMarkdown, 100000);
        Required("category", request.Category, 80);
        if (request.Tags?.Count > 20 || request.Tags?.Any(x => x.Length > 40) == true)
            errors["tags"] = ["Massimo 20 tag da 40 caratteri ciascuno."];
        if (request.Status is not ("Draft" or "Published" or "Archived"))
            errors["status"] = ["Stato non valido."];
        if (!string.IsNullOrWhiteSpace(request.CoverImageUrl) &&
            (!Uri.TryCreate(request.CoverImageUrl, UriKind.Absolute, out var imageUri) ||
             imageUri.Scheme is not ("https" or "http")))
            errors["coverImageUrl"] = ["Inserisci un URL HTTP o HTTPS valido."];
        if (request.SeoTitle?.Length > 180) errors["seoTitle"] = ["Massimo 180 caratteri."];
        if (request.SeoDescription?.Length > 320) errors["seoDescription"] = ["Massimo 320 caratteri."];
        return errors;
    }

    private static string NormalizeSlug(string value)
    {
        var normalized = value.Trim().ToLowerInvariant();
        normalized = SlugSeparators().Replace(normalized, "-");
        return SlugInvalid().Replace(normalized, "").Trim('-');
    }

    [GeneratedRegex(@"[\s_]+")] private static partial Regex SlugSeparators();
    [GeneratedRegex(@"[^a-z0-9-]")] private static partial Regex SlugInvalid();

    private static void Apply(BlogPost post, BlogPostRequest request, string slug)
    {
        var wasPublished = post.PublishedAt is not null;
        post.Title = request.Title.Trim();
        post.Slug = slug;
        post.Excerpt = request.Excerpt.Trim();
        post.ContentMarkdown = request.ContentMarkdown.Trim();
        post.Category = request.Category.Trim();
        post.TagsJson = JsonSerializer.Serialize((request.Tags ?? []).Select(x => x.Trim()).Where(x => x.Length > 0).Distinct(StringComparer.OrdinalIgnoreCase).ToArray(), JsonOptions);
        post.CoverImageUrl = string.IsNullOrWhiteSpace(request.CoverImageUrl) ? null : request.CoverImageUrl.Trim();
        post.SeoTitle = string.IsNullOrWhiteSpace(request.SeoTitle) ? null : request.SeoTitle.Trim();
        post.SeoDescription = string.IsNullOrWhiteSpace(request.SeoDescription) ? null : request.SeoDescription.Trim();
        post.Status = request.Status;
        post.UpdatedAt = DateTimeOffset.UtcNow;
        if (request.Status == "Published" && !wasPublished) post.PublishedAt = DateTimeOffset.UtcNow;
        if (request.Status != "Published") post.PublishedAt = null;
    }

    private static BlogPostResponse ToResponse(BlogPost post) =>
        new(post.Id, post.Title, post.Slug, post.Excerpt, post.ContentMarkdown, post.Category,
            JsonSerializer.Deserialize<string[]>(post.TagsJson, JsonOptions) ?? [], post.CoverImageUrl,
            post.SeoTitle, post.SeoDescription, post.Status, post.CreatedAt, post.UpdatedAt, post.PublishedAt);
}
