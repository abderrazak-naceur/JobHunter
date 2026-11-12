using System.Text.Json;
using JobHunter.Api.Contracts;
using JobHunter.Api.Domain;
using JobHunter.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace JobHunter.Api.Endpoints;

public static class PortfolioEndpoints
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public const int MaxLinks = 10;
    public const int MaxSkillGroups = 20;
    public const int MaxSkillsPerGroup = 40;
    public const int MaxExperiences = 30;
    public const int MaxHighlights = 15;
    public const int MaxProjects = 30;
    public const int MaxTechnologies = 20;
    public const int MaxStats = 4;
    public const int MaxPhotoBytes = 2 * 1024 * 1024;

    /// <summary>Public address of the uploaded profile photo (relative to the API).</summary>
    public const string PhotoPath = "/api/v1/portfolio/photo";

    private static string PhotoUrlFor(DateTimeOffset updatedAt) => $"{PhotoPath}?v={updatedAt.UtcTicks}";

    /// <summary>
    /// Shown until the owner saves their own content from the admin area. Loaded from
    /// <c>content/portfolio.default.json</c>, which is embedded in the assembly and also used as the
    /// offline fallback of the website, so there is a single source of truth.
    /// </summary>
    public static PortfolioContentDto DefaultContent { get; } = LoadDefaultContent();

    private static PortfolioContentDto LoadDefaultContent()
    {
        using var stream = typeof(PortfolioEndpoints).Assembly.GetManifestResourceStream("portfolio.default.json")
            ?? throw new InvalidOperationException("Embedded resource 'portfolio.default.json' is missing.");
        return JsonSerializer.Deserialize<PortfolioContentDto>(stream, JsonOptions)
            ?? throw new InvalidOperationException("Embedded resource 'portfolio.default.json' is empty.");
    }

    public static IEndpointRouteBuilder MapPortfolioEndpoints(this IEndpointRouteBuilder endpoints)
    {
        // Public: the content shown on the portfolio page.
        endpoints.MapGet("/api/v1/portfolio", async (
            HttpContext http,
            JobHunterDbContext db,
            ILoggerFactory loggerFactory,
            CancellationToken cancellationToken) =>
        {
            var profile = await db.PortfolioProfiles.AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == PortfolioProfile.SingletonId, cancellationToken);

            var content = DefaultContent;
            if (profile is not null)
            {
                try
                {
                    content = JsonSerializer.Deserialize<PortfolioContentDto>(profile.ContentJson, JsonOptions) ?? DefaultContent;
                }
                catch (JsonException exception)
                {
                    // A damaged document must never take the public page down.
                    loggerFactory.CreateLogger("Portfolio").LogError(exception, "Stored portfolio content is not valid JSON; serving defaults.");
                }
            }

            content = content with { Stats = content.Stats ?? [] };

            // An uploaded photo always wins over a manually entered photo URL.
            var photoUpdatedAt = await db.PortfolioAssets.AsNoTracking()
                .Where(x => x.Kind == PortfolioAsset.PhotoKind)
                .Select(x => (DateTimeOffset?)x.UpdatedAt)
                .FirstOrDefaultAsync(cancellationToken);
            if (photoUpdatedAt is not null) content = content with { PhotoUrl = PhotoUrlFor(photoUpdatedAt.Value) };

            http.Response.Headers.CacheControl = "public, max-age=60";
            return Results.Ok(content);
        }).AllowAnonymous().WithTags("Portfolio");

        // Admin only: replace the content.
        endpoints.MapPut("/api/v1/portfolio", async (
            PortfolioContentDto request,
            JobHunterDbContext db,
            CancellationToken cancellationToken) =>
        {
            var (content, errors) = Validate(request);
            if (errors.Count > 0) return Results.ValidationProblem(errors);

            var profile = await db.PortfolioProfiles.FirstOrDefaultAsync(x => x.Id == PortfolioProfile.SingletonId, cancellationToken);
            if (profile is null)
            {
                profile = new PortfolioProfile();
                db.PortfolioProfiles.Add(profile);
            }

            profile.ContentJson = JsonSerializer.Serialize(content, JsonOptions);
            profile.UpdatedAt = DateTimeOffset.UtcNow;
            await db.SaveChangesAsync(cancellationToken);

            return Results.Ok(content);
        }).RequireAuthorization().WithTags("Portfolio");

        // Public: the uploaded profile photo.
        endpoints.MapGet(PhotoPath, async (HttpContext http, JobHunterDbContext db, CancellationToken cancellationToken) =>
        {
            var asset = await db.PortfolioAssets.AsNoTracking()
                .FirstOrDefaultAsync(x => x.Kind == PortfolioAsset.PhotoKind, cancellationToken);
            if (asset is null) return Results.NotFound();

            // The address changes (?v=...) whenever the photo changes, so it can be cached for a long time.
            http.Response.Headers.CacheControl = "public, max-age=86400";
            http.Response.Headers["X-Content-Type-Options"] = "nosniff";
            return Results.File(asset.Data, asset.ContentType);
        }).AllowAnonymous().WithTags("Portfolio");

        // Admin only: upload the photo as the raw request body (image/jpeg, image/png or image/webp).
        endpoints.MapPut(PhotoPath, async (HttpRequest request, JobHunterDbContext db, CancellationToken cancellationToken) =>
        {
            const string tooLarge = "La foto supera i 2 MB.";
            if (request.ContentLength > MaxPhotoBytes) return Results.Problem(title: tooLarge, statusCode: StatusCodes.Status413PayloadTooLarge);

            var data = await ReadLimitedAsync(request.Body, MaxPhotoBytes, cancellationToken);
            if (data is null) return Results.Problem(title: tooLarge, statusCode: StatusCodes.Status413PayloadTooLarge);

            // The type is detected from the file content, never trusted from the Content-Type header.
            var contentType = DetectImageType(data);
            if (contentType is null)
                return Results.Problem(title: "Formato non supportato. Usa un file JPEG, PNG o WebP.", statusCode: StatusCodes.Status415UnsupportedMediaType);

            var asset = await db.PortfolioAssets.FirstOrDefaultAsync(x => x.Kind == PortfolioAsset.PhotoKind, cancellationToken);
            if (asset is null)
            {
                asset = new PortfolioAsset { Kind = PortfolioAsset.PhotoKind };
                db.PortfolioAssets.Add(asset);
            }

            asset.ContentType = contentType;
            asset.Data = data;
            asset.UpdatedAt = DateTimeOffset.UtcNow;
            await db.SaveChangesAsync(cancellationToken);

            return Results.Ok(new PhotoResponse(PhotoUrlFor(asset.UpdatedAt)));
        }).RequireAuthorization().WithTags("Portfolio");

        // Admin only: remove the photo (safe to call when there is none).
        endpoints.MapDelete(PhotoPath, async (JobHunterDbContext db, CancellationToken cancellationToken) =>
        {
            var asset = await db.PortfolioAssets.FirstOrDefaultAsync(x => x.Kind == PortfolioAsset.PhotoKind, cancellationToken);
            if (asset is not null)
            {
                db.PortfolioAssets.Remove(asset);
                await db.SaveChangesAsync(cancellationToken);
            }

            return Results.NoContent();
        }).RequireAuthorization().WithTags("Portfolio");

        return endpoints;
    }

    private static async Task<byte[]?> ReadLimitedAsync(Stream body, int maxBytes, CancellationToken cancellationToken)
    {
        using var buffer = new MemoryStream();
        var chunk = new byte[16 * 1024];
        int read;
        while ((read = await body.ReadAsync(chunk, cancellationToken)) > 0)
        {
            if (buffer.Length + read > maxBytes) return null;
            buffer.Write(chunk, 0, read);
        }

        return buffer.ToArray();
    }

    /// <summary>Recognises JPEG, PNG and WebP by their signature. SVG is deliberately not accepted (it can carry scripts).</summary>
    public static string? DetectImageType(ReadOnlySpan<byte> data)
    {
        if (data.Length >= 3 && data[0] == 0xFF && data[1] == 0xD8 && data[2] == 0xFF) return "image/jpeg";
        if (data.Length >= 8 && data[..8].SequenceEqual<byte>([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])) return "image/png";
        if (data.Length >= 12 && data[..4].SequenceEqual<byte>("RIFF"u8) && data[8..12].SequenceEqual<byte>("WEBP"u8)) return "image/webp";
        return null;
    }

    /// <summary>Trims every text and returns the cleaned document, or the validation errors.</summary>
    public static (PortfolioContentDto Content, Dictionary<string, string[]> Errors) Validate(PortfolioContentDto request)
    {
        var errors = new Dictionary<string, string[]>();

        void Fail(string key, string message) => errors[key] = [message];

        string Required(string? value, string key, string label, int max)
        {
            var text = value?.Trim() ?? "";
            if (text.Length == 0) Fail(key, $"{label} è obbligatorio.");
            else if (text.Length > max) Fail(key, $"{label} può contenere al massimo {max} caratteri.");
            return text;
        }

        string Optional(string? value, string key, string label, int max)
        {
            var text = value?.Trim() ?? "";
            if (text.Length > max) Fail(key, $"{label} può contenere al massimo {max} caratteri.");
            return text;
        }

        string? OptionalUrl(string? value, string key, string label)
        {
            var text = value?.Trim() ?? "";
            if (text.Length == 0) return null;
            if (text.Length > 500 || !IsHttpUrl(text)) Fail(key, $"{label} deve essere un URL http/https valido (massimo 500 caratteri).");
            return text;
        }

        var name = Required(request.Name, nameof(request.Name), "Il nome", 120);
        var role = Required(request.Role, nameof(request.Role), "Il ruolo", 120);
        var tagline = Optional(request.Tagline, nameof(request.Tagline), "Lo slogan", 250);
        var summary = Required(request.Summary, nameof(request.Summary), "La presentazione", 2000);
        var location = Optional(request.Location, nameof(request.Location), "La località", 120);
        var workMode = Optional(request.WorkMode, nameof(request.WorkMode), "La modalità di lavoro", 120);

        string? email = request.Email?.Trim();
        if (string.IsNullOrEmpty(email)) email = null;
        else if (email.Length > 254 || !IsEmail(email)) Fail(nameof(request.Email), "Inserisci un indirizzo email valido.");

        var cvUrl = OptionalUrl(request.CvUrl, nameof(request.CvUrl), "Il link al CV");
        // The address of the uploaded photo is derived by the server; it is never stored in the content.
        var photoUrl = request.PhotoUrl?.Trim() is { } submittedPhoto && submittedPhoto.StartsWith(PhotoPath, StringComparison.Ordinal)
            ? null
            : OptionalUrl(request.PhotoUrl, nameof(request.PhotoUrl), "Il link alla foto");

        var links = new List<PortfolioLinkDto>();
        var rawLinks = request.Links ?? [];
        if (rawLinks.Count > MaxLinks) Fail(nameof(request.Links), $"Massimo {MaxLinks} link.");
        for (var i = 0; i < Math.Min(rawLinks.Count, MaxLinks); i++)
        {
            var label = Required(rawLinks[i]?.Label, $"Links[{i}].Label", "Il nome del link", 60);
            var url = rawLinks[i]?.Url?.Trim() ?? "";
            if (url.Length == 0 || url.Length > 500 || !IsHttpUrl(url))
                Fail($"Links[{i}].Url", "Il link deve essere un URL http/https valido (massimo 500 caratteri).");
            links.Add(new PortfolioLinkDto(label, url));
        }

        var skillGroups = new List<SkillGroupDto>();
        var rawGroups = request.SkillGroups ?? [];
        if (rawGroups.Count > MaxSkillGroups) Fail(nameof(request.SkillGroups), $"Massimo {MaxSkillGroups} gruppi di competenze.");
        for (var i = 0; i < Math.Min(rawGroups.Count, MaxSkillGroups); i++)
        {
            var title = Required(rawGroups[i]?.Title, $"SkillGroups[{i}].Title", "Il titolo del gruppo", 60);
            var skills = CleanList(rawGroups[i]?.Skills);
            if (skills.Count > MaxSkillsPerGroup) Fail($"SkillGroups[{i}].Skills", $"Massimo {MaxSkillsPerGroup} competenze per gruppo.");
            else if (skills.Any(s => s.Length > 60)) Fail($"SkillGroups[{i}].Skills", "Ogni competenza può contenere al massimo 60 caratteri.");
            skillGroups.Add(new SkillGroupDto(title, skills));
        }

        var experiences = new List<ExperienceDto>();
        var rawExperiences = request.Experiences ?? [];
        if (rawExperiences.Count > MaxExperiences) Fail(nameof(request.Experiences), $"Massimo {MaxExperiences} esperienze.");
        for (var i = 0; i < Math.Min(rawExperiences.Count, MaxExperiences); i++)
        {
            var item = rawExperiences[i];
            var company = Required(item?.Company, $"Experiences[{i}].Company", "L'azienda", 120);
            var itemRole = Required(item?.Role, $"Experiences[{i}].Role", "Il ruolo", 120);
            var period = Required(item?.Period, $"Experiences[{i}].Period", "Il periodo", 60);
            var description = Optional(item?.Description, $"Experiences[{i}].Description", "La descrizione", 2000);
            var highlights = CleanList(item?.Highlights);
            if (highlights.Count > MaxHighlights) Fail($"Experiences[{i}].Highlights", $"Massimo {MaxHighlights} punti elenco.");
            else if (highlights.Any(h => h.Length > 300)) Fail($"Experiences[{i}].Highlights", "Ogni punto può contenere al massimo 300 caratteri.");
            experiences.Add(new ExperienceDto(company, itemRole, period, description, highlights));
        }

        var projects = new List<ProjectDto>();
        var rawProjects = request.Projects ?? [];
        if (rawProjects.Count > MaxProjects) Fail(nameof(request.Projects), $"Massimo {MaxProjects} progetti.");
        for (var i = 0; i < Math.Min(rawProjects.Count, MaxProjects); i++)
        {
            var item = rawProjects[i];
            var projectName = Required(item?.Name, $"Projects[{i}].Name", "Il nome del progetto", 120);
            var description = Optional(item?.Description, $"Projects[{i}].Description", "La descrizione", 1000);
            var technologies = CleanList(item?.Technologies);
            if (technologies.Count > MaxTechnologies) Fail($"Projects[{i}].Technologies", $"Massimo {MaxTechnologies} tecnologie.");
            else if (technologies.Any(t => t.Length > 60)) Fail($"Projects[{i}].Technologies", "Ogni tecnologia può contenere al massimo 60 caratteri.");
            var url = OptionalUrl(item?.Url, $"Projects[{i}].Url", "Il link del progetto");
            projects.Add(new ProjectDto(projectName, description, technologies, url));
        }

        var stats = new List<StatDto>();
        var rawStats = request.Stats ?? [];
        if (rawStats.Count > MaxStats) Fail(nameof(request.Stats), $"Massimo {MaxStats} numeri in evidenza.");
        for (var i = 0; i < Math.Min(rawStats.Count, MaxStats); i++)
        {
            var value = Required(rawStats[i]?.Value, $"Stats[{i}].Value", "Il valore", 20);
            var label = Required(rawStats[i]?.Label, $"Stats[{i}].Label", "L'etichetta", 60);
            stats.Add(new StatDto(value, label));
        }

        var content = new PortfolioContentDto(name, role, tagline, summary, location, workMode, email, cvUrl,
            links, skillGroups, experiences, projects, stats, photoUrl);
        return (content, errors);
    }

    private static List<string> CleanList(IReadOnlyList<string>? values) =>
        (values ?? []).Select(v => v?.Trim() ?? "").Where(v => v.Length > 0).ToList();

    private static bool IsHttpUrl(string value) =>
        Uri.TryCreate(value, UriKind.Absolute, out var uri) &&
        (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps) &&
        !string.IsNullOrEmpty(uri.Host);

    private static bool IsEmail(string value)
    {
        var at = value.IndexOf('@');
        return at > 0 && at == value.LastIndexOf('@') && at < value.Length - 3 &&
               value[(at + 1)..].Contains('.') && !value.Any(char.IsWhiteSpace) &&
               !value.StartsWith('.') && !value.EndsWith('.');
    }
}
