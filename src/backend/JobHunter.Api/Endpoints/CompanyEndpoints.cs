using JobHunter.Api.Contracts;
using JobHunter.Api.Domain;
using JobHunter.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace JobHunter.Api.Endpoints;

public static class CompanyEndpoints
{
    public static IEndpointRouteBuilder MapCompanyEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/v1/companies").WithTags("Companies").RequireAuthorization();

        group.MapGet("/", async (
            string? search,
            bool? followed,
            string? priority,
            int? page,
            int? pageSize,
            JobHunterDbContext db,
            CancellationToken cancellationToken) =>
        {
            var currentPage = Math.Max(1, page ?? 1);
            var size = Math.Clamp(pageSize ?? 20, 1, 100);
            var query = db.Companies.AsNoTracking();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim().ToLower();
                query = query.Where(x =>
                    x.Name.ToLower().Contains(term) ||
                    x.Location.ToLower().Contains(term) ||
                    x.Sector.ToLower().Contains(term) ||
                    x.Technologies.ToLower().Contains(term));
            }

            if (followed.HasValue)
                query = query.Where(x => x.Followed == followed.Value);

            if (!string.IsNullOrWhiteSpace(priority))
                query = query.Where(x => x.Priority == priority);

            var total = await query.CountAsync(cancellationToken);
            var entities = await query
                .OrderBy(x => x.Priority == "Alta" ? 0 : x.Priority == "Media" ? 1 : 2)
                .ThenBy(x => x.Name)
                .Skip((currentPage - 1) * size)
                .Take(size)
                .ToListAsync(cancellationToken);
            var items = entities.Select(ToResponse).ToList();

            return Results.Ok(new PagedCompaniesResponse(items, currentPage, size, total));
        });

        group.MapGet("/{id:guid}", async (Guid id, JobHunterDbContext db, CancellationToken cancellationToken) =>
        {
            var company = await db.Companies.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
            return company is null ? Results.NotFound() : Results.Ok(ToResponse(company));
        });

        group.MapPost("/", async (CompanyRequest request, JobHunterDbContext db, CancellationToken cancellationToken) =>
        {
            var validation = Validate(request);
            if (validation is not null) return Results.ValidationProblem(validation);

            var careersUrl = request.CareersUrl.Trim();
            if (await db.Companies.AnyAsync(x => x.CareersUrl == careersUrl, cancellationToken))
                return Results.Conflict(new { message = "Questa pagina Careers è già registrata." });

            var company = FromRequest(request);
            company.CareersUrl = careersUrl;
            db.Companies.Add(company);
            await db.SaveChangesAsync(cancellationToken);
            return Results.Created($"/api/v1/companies/{company.Id}", ToResponse(company));
        });

        group.MapPut("/{id:guid}", async (Guid id, CompanyRequest request, JobHunterDbContext db, CancellationToken cancellationToken) =>
        {
            var validation = Validate(request);
            if (validation is not null) return Results.ValidationProblem(validation);

            var company = await db.Companies.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
            if (company is null) return Results.NotFound();

            var careersUrl = request.CareersUrl.Trim();
            if (await db.Companies.AnyAsync(x => x.Id != id && x.CareersUrl == careersUrl, cancellationToken))
                return Results.Conflict(new { message = "Questa pagina Careers è già registrata." });

            Apply(company, request);
            company.UpdatedAt = DateTimeOffset.UtcNow;
            await db.SaveChangesAsync(cancellationToken);
            return Results.Ok(ToResponse(company));
        });

        group.MapDelete("/{id:guid}", async (Guid id, JobHunterDbContext db, CancellationToken cancellationToken) =>
        {
            var company = await db.Companies.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
            if (company is null) return Results.NotFound();
            db.Companies.Remove(company);
            await db.SaveChangesAsync(cancellationToken);
            return Results.NoContent();
        });

        return endpoints;
    }

    private static Company FromRequest(CompanyRequest request)
    {
        var company = new Company();
        Apply(company, request);
        return company;
    }

    private static void Apply(Company company, CompanyRequest request)
    {
        company.Name = request.Name.Trim();
        company.Website = Clean(request.Website);
        company.CareersUrl = request.CareersUrl.Trim();
        company.Location = Clean(request.Location);
        company.Sector = Clean(request.Sector);
        company.Technologies = Clean(request.Technologies);
        company.Priority = request.Priority.Trim();
        company.Notes = Clean(request.Notes);
        company.Followed = request.Followed;
    }

    private static string Clean(string? value) => value?.Trim() ?? string.Empty;

    private static CompanyResponse ToResponse(Company company) => new(
        company.Id, company.Name, company.Website, company.CareersUrl, company.Location,
        company.Sector, company.Technologies, company.Priority, company.Notes,
        company.Followed, company.CreatedAt, company.UpdatedAt);

    private static Dictionary<string, string[]>? Validate(CompanyRequest request)
    {
        var errors = new Dictionary<string, string[]>();
        if (string.IsNullOrWhiteSpace(request.Name) || request.Name.Trim().Length > 180)
            errors[nameof(request.Name)] = ["Il nome è obbligatorio e deve contenere al massimo 180 caratteri."];
        if (!InputRules.IsHttpUrl(request.CareersUrl) || request.CareersUrl.Trim().Length > 1000)
            errors[nameof(request.CareersUrl)] = ["Inserisci un URL Careers http/https valido, massimo 1000 caratteri."];
        if (!string.IsNullOrWhiteSpace(request.Website) &&
            (!InputRules.IsHttpUrl(request.Website) || request.Website.Trim().Length > 500))
            errors[nameof(request.Website)] = ["Il sito ufficiale deve essere un URL http/https valido, massimo 500 caratteri."];
        if ((request.Location?.Length ?? 0) > 180)
            errors[nameof(request.Location)] = ["La località può contenere al massimo 180 caratteri."];
        if ((request.Sector?.Length ?? 0) > 180)
            errors[nameof(request.Sector)] = ["Il settore può contenere al massimo 180 caratteri."];
        if ((request.Technologies?.Length ?? 0) > 1000)
            errors[nameof(request.Technologies)] = ["Le tecnologie possono contenere al massimo 1000 caratteri."];
        if (request.Priority is not ("Alta" or "Media" or "Bassa"))
            errors[nameof(request.Priority)] = ["La priorità deve essere Alta, Media o Bassa."];
        if ((request.Notes?.Length ?? 0) > 4000)
            errors[nameof(request.Notes)] = ["Le note possono contenere al massimo 4000 caratteri."];
        return errors.Count == 0 ? null : errors;
    }
}
