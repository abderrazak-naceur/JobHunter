using System.Text.RegularExpressions;
using JobHunter.Api.Contracts;
using JobHunter.Api.Domain;
using JobHunter.Api.Infrastructure;
using JobHunter.Api.Infrastructure.JobDiscovery;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace JobHunter.Api.Endpoints;

public static class JobDiscoveryEndpoints
{
    public const string SearchRateLimitPolicy = "job-discovery-search";

    public static IEndpointRouteBuilder MapJobDiscoveryEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/v1/job-discovery").WithTags("Job Discovery").RequireAuthorization();

        group.MapGet("/profiles", async (JobHunterDbContext db, CancellationToken ct) =>
            Results.Ok((await db.SearchProfiles.AsNoTracking().OrderByDescending(x => x.UpdatedAt).ToListAsync(ct)).Select(ToResponse)));

        group.MapPost("/profiles", async (SearchProfileRequest request, JobHunterDbContext db, CancellationToken ct) =>
        {
            var errors = ValidateProfile(request);
            if (errors is not null) return Results.ValidationProblem(errors);
            if (request.IsActive)
                await db.SearchProfiles.Where(x => x.IsActive).ExecuteUpdateAsync(update => update.SetProperty(x => x.IsActive, false), ct);
            var profile = new JobSearchProfile();
            Apply(profile, request);
            db.SearchProfiles.Add(profile);
            await db.SaveChangesAsync(ct);
            return Results.Created($"/api/v1/job-discovery/profiles/{profile.Id}", ToResponse(profile));
        });

        group.MapPut("/profiles/{id:guid}", async (Guid id, SearchProfileRequest request, JobHunterDbContext db, CancellationToken ct) =>
        {
            var errors = ValidateProfile(request);
            if (errors is not null) return Results.ValidationProblem(errors);
            var profile = await db.SearchProfiles.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (profile is null) return Results.NotFound();
            if (request.IsActive)
                await db.SearchProfiles.Where(x => x.Id != id && x.IsActive).ExecuteUpdateAsync(update => update.SetProperty(x => x.IsActive, false), ct);
            Apply(profile, request);
            profile.UpdatedAt = DateTimeOffset.UtcNow;
            await db.SaveChangesAsync(ct);
            return Results.Ok(ToResponse(profile));
        });

        group.MapGet("/sources", async (JobHunterDbContext db, CancellationToken ct) =>
            Results.Ok((await db.JobSources.AsNoTracking().OrderBy(x => x.CompanyName).ToListAsync(ct)).Select(ToResponse)));

        group.MapPost("/sources", async (JobSourceRequest request, JobHunterDbContext db, CancellationToken ct) =>
        {
            var errors = ValidateSource(request);
            if (errors is not null) return Results.ValidationProblem(errors);
            var provider = request.Provider.Trim().ToLowerInvariant();
            var identifier = request.BoardIdentifier.Trim();
            if (await db.JobSources.AnyAsync(x => x.Provider == provider && x.BoardIdentifier == identifier, ct))
                return Results.Conflict(new { message = "Questa board è già configurata." });
            var source = new JobSource();
            Apply(source, request);
            source.Provider = provider;
            source.BoardIdentifier = identifier;
            db.JobSources.Add(source);
            await db.SaveChangesAsync(ct);
            return Results.Created($"/api/v1/job-discovery/sources/{source.Id}", ToResponse(source));
        });

        group.MapPut("/sources/{id:guid}", async (Guid id, JobSourceRequest request, JobHunterDbContext db, CancellationToken ct) =>
        {
            var errors = ValidateSource(request);
            if (errors is not null) return Results.ValidationProblem(errors);
            var source = await db.JobSources.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (source is null) return Results.NotFound();
            var provider = request.Provider.Trim().ToLowerInvariant();
            var identifier = request.BoardIdentifier.Trim();
            if (await db.JobSources.AnyAsync(x => x.Id != id && x.Provider == provider && x.BoardIdentifier == identifier, ct))
                return Results.Conflict(new { message = "Questa board è già configurata." });
            Apply(source, request);
            source.Provider = provider;
            source.BoardIdentifier = identifier;
            source.UpdatedAt = DateTimeOffset.UtcNow;
            await db.SaveChangesAsync(ct);
            return Results.Ok(ToResponse(source));
        });

        group.MapDelete("/sources/{id:guid}", async (Guid id, JobHunterDbContext db, CancellationToken ct) =>
        {
            var source = await db.JobSources.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (source is null) return Results.NotFound();
            db.JobSources.Remove(source);
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });

        group.MapPost("/search", async (JobDiscoveryService service, CancellationToken ct) =>
            Results.Ok(await service.SearchAsync(ct))).RequireRateLimiting(SearchRateLimitPolicy);

        group.MapGet("/jobs", async (
            string? search, DateOnly? publishedFrom, DateOnly? publishedTo,
            int? minimumMatchScore, int? page, int? pageSize,
            JobDiscoveryService service, CancellationToken ct) =>
            Results.Ok(await service.GetJobsAsync(search, publishedFrom, publishedTo,
                minimumMatchScore ?? -1, page ?? 1, pageSize ?? 20, ct)));

        group.MapGet("/runs", async (int? page, int? pageSize, JobHunterDbContext db, CancellationToken ct) =>
        {
            var currentPage = Math.Max(1, page ?? 1);
            var size = Math.Clamp(pageSize ?? 20, 1, 100);
            var query = db.JobSearchRuns.AsNoTracking().OrderByDescending(x => x.StartedAt);
            var total = await query.CountAsync(ct);
            var runs = await query.Skip((currentPage - 1) * size).Take(size).ToListAsync(ct);
            return Results.Ok(new PagedJobSearchRunsResponse(runs.Select(x =>
                new JobSearchRunResponse(x.Id, x.StartedAt, x.CompletedAt, x.Status, x.FoundCount,
                    x.NewCount, x.UpdatedCount, x.ErrorCount, x.Summary)).ToList(), currentPage, size, total));
        });

        return endpoints;
    }

    private static void Apply(JobSearchProfile profile, SearchProfileRequest request)
    {
        profile.Name = request.Name.Trim();
        profile.RoleKeywords = request.RoleKeywords.Trim();
        profile.SkillKeywords = request.SkillKeywords?.Trim() ?? string.Empty;
        profile.Location = request.Location?.Trim() ?? string.Empty;
        profile.MinimumAnnualSalary = request.MinimumAnnualSalary;
        profile.WorkMode = request.WorkMode.Trim();
        profile.MinimumMatchScore = request.MinimumMatchScore;
        profile.IsActive = request.IsActive;
    }

    private static void Apply(JobSource source, JobSourceRequest request)
    {
        source.CompanyName = request.CompanyName.Trim();
        source.Provider = request.Provider.Trim().ToLowerInvariant();
        source.BoardIdentifier = request.BoardIdentifier.Trim();
        source.CareersUrl = request.CareersUrl?.Trim() ?? string.Empty;
        source.IsEnabled = request.IsEnabled;
    }

    private static Dictionary<string, string[]>? ValidateProfile(SearchProfileRequest request)
    {
        var errors = new Dictionary<string, string[]>();
        if (string.IsNullOrWhiteSpace(request.Name) || request.Name.Trim().Length > 120)
            errors[nameof(request.Name)] = ["Il nome è obbligatorio e deve contenere al massimo 120 caratteri."];
        if (string.IsNullOrWhiteSpace(request.RoleKeywords) || request.RoleKeywords.Length > 1000)
            errors[nameof(request.RoleKeywords)] = ["Inserisci almeno un ruolo, massimo 1000 caratteri."];
        if ((request.SkillKeywords?.Length ?? 0) > 1000)
            errors[nameof(request.SkillKeywords)] = ["Le competenze possono contenere al massimo 1000 caratteri."];
        if ((request.Location?.Length ?? 0) > 180)
            errors[nameof(request.Location)] = ["La località può contenere al massimo 180 caratteri."];
        if (request.MinimumAnnualSalary is < 0 or > 10_000_000)
            errors[nameof(request.MinimumAnnualSalary)] = ["La RAL minima deve essere compresa tra 0 e 10.000.000 euro."];
        if (request.WorkMode is not ("Any" or "RemoteOrHybrid" or "Remote" or "Hybrid" or "OnSite"))
            errors[nameof(request.WorkMode)] = ["La modalità deve essere Any, RemoteOrHybrid, Remote, Hybrid oppure OnSite."];
        if (request.MinimumMatchScore is < 0 or > 100)
            errors[nameof(request.MinimumMatchScore)] = ["La soglia di corrispondenza deve essere tra 0 e 100."];
        return errors.Count == 0 ? null : errors;
    }

    private static Dictionary<string, string[]>? ValidateSource(JobSourceRequest request)
    {
        var errors = new Dictionary<string, string[]>();
        var provider = request.Provider?.Trim().ToLowerInvariant() ?? string.Empty;
        var identifier = request.BoardIdentifier?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(request.CompanyName) || request.CompanyName.Trim().Length > 180)
            errors[nameof(request.CompanyName)] = ["Il nome dell'azienda è obbligatorio (massimo 180 caratteri)."];
        if (provider is not ("lever" or "lever-eu" or "greenhouse"))
            errors[nameof(request.Provider)] = ["Per ora sono supportati Lever, Lever EU e Greenhouse."];
        if (!Regex.IsMatch(identifier, "^[A-Za-z0-9_-]{1,120}$", RegexOptions.CultureInvariant))
            errors[nameof(request.BoardIdentifier)] = ["Inserisci lo slug pubblico della board (solo lettere, numeri, trattino e underscore)."];
        if (!string.IsNullOrWhiteSpace(request.CareersUrl) &&
            (!InputRules.IsHttpUrl(request.CareersUrl) || request.CareersUrl.Trim().Length > 1000))
            errors[nameof(request.CareersUrl)] = ["Il link Careers deve essere un URL http/https valido, massimo 1000 caratteri."];
        return errors.Count == 0 ? null : errors;
    }

    private static SearchProfileResponse ToResponse(JobSearchProfile x) =>
        new(x.Id, x.Name, x.RoleKeywords, x.SkillKeywords, x.Location, x.MinimumAnnualSalary, x.WorkMode,
            x.MinimumMatchScore, x.IsActive, x.CreatedAt, x.UpdatedAt);

    private static JobSourceResponse ToResponse(JobSource x) =>
        new(x.Id, x.CompanyName, x.Provider, x.BoardIdentifier, x.CareersUrl, x.IsEnabled,
            x.LastCheckedAt, x.LastSuccessfulAt, x.LastError, x.CreatedAt, x.UpdatedAt);
}

public sealed record PagedJobSearchRunsResponse(IReadOnlyList<JobSearchRunResponse> Items, int Page, int PageSize, int TotalCount);
