using System.Text.Json;
using System.Text.RegularExpressions;
using JobHunter.Api.Domain;
using JobHunter.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace JobHunter.Api.Endpoints;

public sealed record BlogSettingsDto(
    string SiteName,
    string AuthorName,
    string Tagline,
    string LogoUrl,
    string HeroTitle,
    string HeroDescription,
    string PrimaryColor,
    string AccentColor,
    string BackgroundColor,
    string Template,
    string TextColor = "#172554",
    string MutedTextColor = "#64748b",
    string SurfaceColor = "#ffffff",
    string HeaderBackgroundColor = "#050d22",
    string HeroBackgroundColor = "#050d22",
    string CardBackgroundColor = "#ffffff",
    string FooterBackgroundColor = "#050d22",
    string BorderColor = "#dbeafe",
    string ButtonTextColor = "#ffffff");

public static partial class BlogSettingsEndpoints
{
    private const string AssetKind = "blog-settings";
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private static readonly BlogSettingsDto Defaults = new(
        "ZAK NACEUR",
        "Zak Naceur",
        "Developer · Tech Blog",
        "",
        "Appunti dal mondo tech.",
        "Approfondimenti su .NET, architetture software, AI, DevOps e sviluppo di prodotti digitali, con esempi pratici ed esperienze reali.",
        "#2563eb",
        "#8b5cf6",
        "#eef1ff",
        "premium-tech",
        "#172554",
        "#64748b",
        "#ffffff",
        "#050d22",
        "#050d22",
        "#ffffff",
        "#050d22",
        "#dbeafe",
        "#ffffff");

    public static IEndpointRouteBuilder MapBlogSettingsEndpoints(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapGet("/api/v1/blog/settings", async (JobHunterDbContext db, CancellationToken ct) =>
        {
            var asset = await db.PortfolioAssets.AsNoTracking()
                .FirstOrDefaultAsync(x => x.Kind == AssetKind, ct);
            if (asset is null) return Results.Ok(Defaults);

            try
            {
                return Results.Ok(JsonSerializer.Deserialize<BlogSettingsDto>(asset.Data, JsonOptions) ?? Defaults);
            }
            catch (JsonException)
            {
                return Results.Ok(Defaults);
            }
        }).AllowAnonymous().WithTags("Blog");

        endpoints.MapPut("/api/v1/admin/blog/settings", async (
            BlogSettingsDto request,
            JobHunterDbContext db,
            CancellationToken ct) =>
        {
            var errors = new Dictionary<string, string[]>();

            void Required(string key, string value, int max)
            {
                if (string.IsNullOrWhiteSpace(value)) errors[key] = ["Campo obbligatorio."];
                else if (value.Trim().Length > max) errors[key] = [$"Massimo {max} caratteri."];
            }

            Required(nameof(request.SiteName), request.SiteName, 120);
            Required(nameof(request.AuthorName), request.AuthorName, 120);
            Required(nameof(request.Tagline), request.Tagline, 180);
            Required(nameof(request.HeroTitle), request.HeroTitle, 180);
            Required(nameof(request.HeroDescription), request.HeroDescription, 600);

            foreach (var (key, value) in new[]
            {
                (nameof(request.PrimaryColor), request.PrimaryColor),
                (nameof(request.AccentColor), request.AccentColor),
                (nameof(request.BackgroundColor), request.BackgroundColor),
                (nameof(request.TextColor), request.TextColor),
                (nameof(request.MutedTextColor), request.MutedTextColor),
                (nameof(request.SurfaceColor), request.SurfaceColor),
                (nameof(request.HeaderBackgroundColor), request.HeaderBackgroundColor),
                (nameof(request.HeroBackgroundColor), request.HeroBackgroundColor),
                (nameof(request.CardBackgroundColor), request.CardBackgroundColor),
                (nameof(request.FooterBackgroundColor), request.FooterBackgroundColor),
                (nameof(request.BorderColor), request.BorderColor),
                (nameof(request.ButtonTextColor), request.ButtonTextColor)
            })
            {
                if (!ColorRegex().IsMatch(value ?? ""))
                    errors[key] = ["Inserisci un colore esadecimale nel formato #RRGGBB."];
            }

            if (request.Template is not ("premium-tech" or "editorial-light" or "developer-dark" or "personal-journal"))
                errors[nameof(request.Template)] = ["Template non valido."];

            if (!string.IsNullOrWhiteSpace(request.LogoUrl) &&
                (!Uri.TryCreate(request.LogoUrl, UriKind.Absolute, out var uri) ||
                 uri.Scheme is not ("https" or "http")))
            {
                errors[nameof(request.LogoUrl)] = ["Inserisci un URL HTTP o HTTPS valido."];
            }

            if (errors.Count > 0) return Results.ValidationProblem(errors);

            var clean = request with
            {
                SiteName = request.SiteName.Trim(),
                AuthorName = request.AuthorName.Trim(),
                Tagline = request.Tagline.Trim(),
                LogoUrl = request.LogoUrl?.Trim() ?? "",
                HeroTitle = request.HeroTitle.Trim(),
                HeroDescription = request.HeroDescription.Trim()
            };

            var asset = await db.PortfolioAssets.FirstOrDefaultAsync(x => x.Kind == AssetKind, ct);
            if (asset is null)
            {
                asset = new PortfolioAsset { Kind = AssetKind };
                db.PortfolioAssets.Add(asset);
            }

            asset.ContentType = "application/json";
            asset.Data = JsonSerializer.SerializeToUtf8Bytes(clean, JsonOptions);
            asset.UpdatedAt = DateTimeOffset.UtcNow;
            await db.SaveChangesAsync(ct);

            return Results.Ok(clean);
        }).RequireAuthorization().WithTags("Blog Admin");

        return endpoints;
    }

    [GeneratedRegex("^#[0-9a-fA-F]{6}$")]
    private static partial Regex ColorRegex();
}
