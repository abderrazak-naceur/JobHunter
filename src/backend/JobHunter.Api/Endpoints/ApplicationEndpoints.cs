using JobHunter.Api.Contracts;
using JobHunter.Api.Domain;
using JobHunter.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace JobHunter.Api.Endpoints;

/// <summary>Tracker of the jobs the owner saved and applied for, with the history of each status change.</summary>
public static class ApplicationEndpoints
{
    public static IEndpointRouteBuilder MapApplicationEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/v1/applications").WithTags("Applications").RequireAuthorization();

        group.MapGet("/", async (
            string? search,
            string? status,
            int? page,
            int? pageSize,
            JobHunterDbContext db,
            CancellationToken cancellationToken) =>
        {
            if (!string.IsNullOrWhiteSpace(status) && !ApplicationStatuses.All.Contains(status))
                return Results.ValidationProblem(new Dictionary<string, string[]> { ["status"] = ["Stato non valido."] });

            var currentPage = Math.Max(1, page ?? 1);
            var size = Math.Clamp(pageSize ?? 20, 1, 100);
            var query = db.JobApplications.AsNoTracking();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim().ToLower();
                query = query.Where(x =>
                    x.Company.ToLower().Contains(term) ||
                    x.Role.ToLower().Contains(term) ||
                    x.Location.ToLower().Contains(term) ||
                    x.Source.ToLower().Contains(term));
            }

            if (!string.IsNullOrWhiteSpace(status))
                query = query.Where(x => x.Status == status);

            var total = await query.CountAsync(cancellationToken);
            var entities = await query
                .OrderByDescending(x => x.UpdatedAt)
                .ThenBy(x => x.Company)
                .Skip((currentPage - 1) * size)
                .Take(size)
                .ToListAsync(cancellationToken);

            return Results.Ok(new PagedApplicationsResponse(entities.Select(ToResponse).ToList(), currentPage, size, total));
        });

        group.MapGet("/summary", async (JobHunterDbContext db, CancellationToken cancellationToken) =>
        {
            var counts = await db.JobApplications.AsNoTracking()
                .GroupBy(x => x.Status)
                .Select(g => new { Status = g.Key, Count = g.Count() })
                .ToListAsync(cancellationToken);
            var byStatus = ApplicationStatuses.All.ToDictionary(s => s, s => counts.FirstOrDefault(c => c.Status == s)?.Count ?? 0);

            // Everything that still has a next step, oldest first, so overdue steps come first.
            var withNextStep = await db.JobApplications.AsNoTracking()
                .Where(x => x.NextStepOn != null && x.Status != ApplicationStatuses.Rejected && x.Status != ApplicationStatuses.Withdrawn)
                .OrderBy(x => x.NextStepOn)
                .Take(8)
                .ToListAsync(cancellationToken);
            var upcoming = withNextStep
                .Select(x => new UpcomingStepResponse(x.Id, x.Company, x.Role, x.NextStep, x.NextStepOn!.Value))
                .ToList();

            return Results.Ok(new ApplicationSummaryResponse(byStatus.Values.Sum(), byStatus, upcoming));
        });

        group.MapGet("/analytics", async (JobHunterDbContext db, CancellationToken cancellationToken) =>
        {
            // A personal tracker holds hundreds of rows at most, so the numbers are computed in memory from the history.
            var applications = await db.JobApplications.AsNoTracking().Include(x => x.Events).ToListAsync(cancellationToken);
            return Results.Ok(ApplicationAnalytics.Compute(applications, DateTime.UtcNow));
        });
        group.MapGet("/{id:guid}", async (Guid id, JobHunterDbContext db, CancellationToken cancellationToken) =>
        {
            var application = await db.JobApplications.AsNoTracking()
                .Include(x => x.Events)
                .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
            return application is null ? Results.NotFound() : Results.Ok(ToDetail(application));
        });

        group.MapPost("/", async (ApplicationRequest request, JobHunterDbContext db, CancellationToken cancellationToken) =>
        {
            var errors = Validate(request);
            if (errors is not null) return Results.ValidationProblem(errors);

            var application = new JobApplication();
            Apply(application, request);
            application.Events.Add(new ApplicationEvent { ApplicationId = application.Id, FromStatus = null, ToStatus = application.Status });
            db.JobApplications.Add(application);
            await db.SaveChangesAsync(cancellationToken);

            return Results.Created($"/api/v1/applications/{application.Id}", ToDetail(application));
        });

        group.MapPut("/{id:guid}", async (Guid id, ApplicationRequest request, JobHunterDbContext db, CancellationToken cancellationToken) =>
        {
            var errors = Validate(request);
            if (errors is not null) return Results.ValidationProblem(errors);

            var application = await db.JobApplications.Include(x => x.Events).FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
            if (application is null) return Results.NotFound();

            var previousStatus = application.Status;
            Apply(application, request);
            application.UpdatedAt = DateTime.UtcNow;
            if (previousStatus != application.Status)
            {
                // Added through the context so EF inserts it, instead of assuming the entity already exists.
                db.ApplicationEvents.Add(new ApplicationEvent { ApplicationId = application.Id, FromStatus = previousStatus, ToStatus = application.Status });
            }

            await db.SaveChangesAsync(cancellationToken);
            return Results.Ok(ToDetail(application));
        });

        group.MapDelete("/{id:guid}", async (Guid id, JobHunterDbContext db, CancellationToken cancellationToken) =>
        {
            var application = await db.JobApplications.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
            if (application is null) return Results.NotFound();

            db.JobApplications.Remove(application); // the history is deleted with it (cascade)
            await db.SaveChangesAsync(cancellationToken);
            return Results.NoContent();
        });

        return endpoints;
    }

    private static string Clean(string? value) => value?.Trim() ?? "";

    private static void Apply(JobApplication application, ApplicationRequest request)
    {
        application.Company = request.Company.Trim();
        application.Role = request.Role.Trim();
        application.Status = request.Status.Trim();
        application.Source = Clean(request.Source);
        application.Url = Clean(request.Url);
        application.Location = Clean(request.Location);
        application.SalaryRange = Clean(request.SalaryRange);
        application.ContactName = Clean(request.ContactName);
        application.ContactEmail = Clean(request.ContactEmail);
        application.AppliedOn = request.AppliedOn;
        application.NextStep = Clean(request.NextStep);
        application.NextStepOn = request.NextStepOn;
        application.Notes = Clean(request.Notes);
    }

    private static ApplicationResponse ToResponse(JobApplication a) => new(
        a.Id, a.Company, a.Role, a.Status, a.Source, a.Url, a.Location, a.SalaryRange, a.ContactName, a.ContactEmail,
        a.AppliedOn, a.NextStep, a.NextStepOn, a.Notes, a.CreatedAt, a.UpdatedAt);

    private static ApplicationDetailResponse ToDetail(JobApplication a) => new(
        a.Id, a.Company, a.Role, a.Status, a.Source, a.Url, a.Location, a.SalaryRange, a.ContactName, a.ContactEmail,
        a.AppliedOn, a.NextStep, a.NextStepOn, a.Notes, a.CreatedAt, a.UpdatedAt,
        a.Events.OrderByDescending(e => e.At).Select(e => new ApplicationEventResponse(e.Id, e.At, e.FromStatus, e.ToStatus)).ToList());

    private static Dictionary<string, string[]>? Validate(ApplicationRequest request)
    {
        var errors = new Dictionary<string, string[]>();

        if (string.IsNullOrWhiteSpace(request.Company) || request.Company.Trim().Length > 180)
            errors[nameof(request.Company)] = ["L'azienda è obbligatoria e deve contenere al massimo 180 caratteri."];
        if (string.IsNullOrWhiteSpace(request.Role) || request.Role.Trim().Length > 180)
            errors[nameof(request.Role)] = ["Il ruolo è obbligatorio e deve contenere al massimo 180 caratteri."];
        if (request.Status is null || !ApplicationStatuses.All.Contains(request.Status.Trim()))
            errors[nameof(request.Status)] = ["Lo stato non è valido."];
        if (Clean(request.Source).Length > 120)
            errors[nameof(request.Source)] = ["La fonte può contenere al massimo 120 caratteri."];
        if (Clean(request.Url).Length > 0 && (Clean(request.Url).Length > 1000 || !InputRules.IsHttpUrl(Clean(request.Url))))
            errors[nameof(request.Url)] = ["Il link deve essere un URL http/https valido, massimo 1000 caratteri."];
        if (Clean(request.Location).Length > 180)
            errors[nameof(request.Location)] = ["La località può contenere al massimo 180 caratteri."];
        if (Clean(request.SalaryRange).Length > 120)
            errors[nameof(request.SalaryRange)] = ["La retribuzione può contenere al massimo 120 caratteri."];
        if (Clean(request.ContactName).Length > 180)
            errors[nameof(request.ContactName)] = ["Il nome del contatto può contenere al massimo 180 caratteri."];
        if (Clean(request.ContactEmail).Length > 0 && (Clean(request.ContactEmail).Length > 254 || !InputRules.IsEmail(Clean(request.ContactEmail))))
            errors[nameof(request.ContactEmail)] = ["Inserisci un indirizzo email valido."];
        if (Clean(request.NextStep).Length > 250)
            errors[nameof(request.NextStep)] = ["Il prossimo passo può contenere al massimo 250 caratteri."];
        if (Clean(request.Notes).Length > 4000)
            errors[nameof(request.Notes)] = ["Le note possono contenere al massimo 4000 caratteri."];
        if (request.AppliedOn is { Year: < 2000 or > 2100 })
            errors[nameof(request.AppliedOn)] = ["La data di candidatura non è valida."];
        if (request.NextStepOn is { Year: < 2000 or > 2100 })
            errors[nameof(request.NextStepOn)] = ["La data del prossimo passo non è valida."];

        return errors.Count == 0 ? null : errors;
    }
}
