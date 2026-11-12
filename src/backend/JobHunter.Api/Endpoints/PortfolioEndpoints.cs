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

    /// <summary>Shown until the owner saves their own content from the admin area.</summary>
    public static PortfolioContentDto DefaultContent { get; } = new(
        Name: "Il tuo nome",
        Role: "Senior .NET Developer",
        Tagline: "Costruisco applicazioni web affidabili con C#, ASP.NET Core e React.",
        Summary: "Presentati in poche righe: esperienza, tipo di progetti e cosa cerchi.",
        Location: "Milano e dintorni",
        WorkMode: "Remote / Hybrid",
        Email: null,
        CvUrl: null,
        Links: [],
        SkillGroups:
        [
            new("Backend", ["C# / .NET", "ASP.NET Core", "REST API"]),
            new("Frontend", ["React", "TypeScript"]),
            new("Dati", ["SQL Server", "PostgreSQL"]),
            new("Cloud e DevOps", ["Azure", "Docker"])
        ],
        Experiences: [],
        Projects: [],
        Stats: [new("10+", "Anni di esperienza")]);

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

        return endpoints;
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
        var photoUrl = OptionalUrl(request.PhotoUrl, nameof(request.PhotoUrl), "Il link alla foto");

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
