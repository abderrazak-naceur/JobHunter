using JobHunter.Api.Contracts;
using JobHunter.Api.Domain;
using JobHunter.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace JobHunter.Api.Endpoints;

/// <summary>People met during the job search, with the date of the last contact and of the next follow-up.</summary>
public static class ContactEndpoints
{
    public static IEndpointRouteBuilder MapContactEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/v1/contacts").WithTags("Contacts").RequireAuthorization();

        group.MapGet("/", async (
            string? search,
            string? kind,
            int? page,
            int? pageSize,
            JobHunterDbContext db,
            CancellationToken cancellationToken) =>
        {
            if (!string.IsNullOrWhiteSpace(kind) && !ContactKinds.All.Contains(kind))
                return Results.ValidationProblem(new Dictionary<string, string[]> { ["kind"] = ["Tipo non valido."] });

            var currentPage = Math.Max(1, page ?? 1);
            var size = Math.Clamp(pageSize ?? 20, 1, 100);
            var query = db.Contacts.AsNoTracking();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim().ToLower();
                query = query.Where(x => x.Name.ToLower().Contains(term) || x.Company.ToLower().Contains(term) || x.Role.ToLower().Contains(term));
            }

            if (!string.IsNullOrWhiteSpace(kind)) query = query.Where(x => x.Kind == kind);

            var total = await query.CountAsync(cancellationToken);
            var entities = await query
                .OrderByDescending(x => x.UpdatedAt)
                .ThenBy(x => x.Name)
                .Skip((currentPage - 1) * size)
                .Take(size)
                .ToListAsync(cancellationToken);

            return Results.Ok(new PagedContactsResponse(entities.Select(ToResponse).ToList(), currentPage, size, total));
        });

        // How many follow-ups are due today or late, and the next few, soonest first.
        group.MapGet("/summary", async (JobHunterDbContext db, CancellationToken cancellationToken) =>
        {
            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            var total = await db.Contacts.CountAsync(cancellationToken);
            var due = await db.Contacts.CountAsync(x => x.NextFollowUpOn != null && x.NextFollowUpOn <= today, cancellationToken);
            var next = await db.Contacts.AsNoTracking()
                .Where(x => x.NextFollowUpOn != null)
                .OrderBy(x => x.NextFollowUpOn)
                .Take(5)
                .ToListAsync(cancellationToken);
            return Results.Ok(new ContactSummaryResponse(total, due, next.Select(ToResponse).ToList()));
        });

        group.MapGet("/{id:guid}", async (Guid id, JobHunterDbContext db, CancellationToken cancellationToken) =>
        {
            var contact = await db.Contacts.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
            return contact is null ? Results.NotFound() : Results.Ok(ToResponse(contact));
        });

        group.MapPost("/", async (ContactRequest request, JobHunterDbContext db, CancellationToken cancellationToken) =>
        {
            var errors = Validate(request);
            if (errors is not null) return Results.ValidationProblem(errors);

            var contact = new Contact();
            Apply(contact, request);
            db.Contacts.Add(contact);
            await db.SaveChangesAsync(cancellationToken);
            return Results.Created($"/api/v1/contacts/{contact.Id}", ToResponse(contact));
        });

        group.MapPut("/{id:guid}", async (Guid id, ContactRequest request, JobHunterDbContext db, CancellationToken cancellationToken) =>
        {
            var errors = Validate(request);
            if (errors is not null) return Results.ValidationProblem(errors);

            var contact = await db.Contacts.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
            if (contact is null) return Results.NotFound();

            Apply(contact, request);
            contact.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync(cancellationToken);
            return Results.Ok(ToResponse(contact));
        });

        group.MapDelete("/{id:guid}", async (Guid id, JobHunterDbContext db, CancellationToken cancellationToken) =>
        {
            var contact = await db.Contacts.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
            if (contact is null) return Results.NotFound();

            db.Contacts.Remove(contact);
            await db.SaveChangesAsync(cancellationToken);
            return Results.NoContent();
        });

        return endpoints;
    }

    private static string Clean(string? value) => value?.Trim() ?? "";

    private static void Apply(Contact contact, ContactRequest request)
    {
        contact.Name = request.Name.Trim();
        contact.Kind = request.Kind.Trim();
        contact.Company = Clean(request.Company);
        contact.Role = Clean(request.Role);
        contact.Email = Clean(request.Email);
        contact.Phone = Clean(request.Phone);
        contact.ProfileUrl = Clean(request.ProfileUrl);
        contact.Notes = Clean(request.Notes);
        contact.LastContactOn = request.LastContactOn;
        contact.NextFollowUpOn = request.NextFollowUpOn;
    }

    public static ContactResponse ToResponse(Contact c) => new(
        c.Id, c.Name, c.Kind, c.Company, c.Role, c.Email, c.Phone, c.ProfileUrl, c.Notes,
        c.LastContactOn, c.NextFollowUpOn, c.CreatedAt, c.UpdatedAt);

    private static Dictionary<string, string[]>? Validate(ContactRequest request)
    {
        var errors = new Dictionary<string, string[]>();

        if (string.IsNullOrWhiteSpace(request.Name) || request.Name.Trim().Length > 180)
            errors[nameof(request.Name)] = ["Il nome è obbligatorio e deve contenere al massimo 180 caratteri."];
        if (request.Kind is null || !ContactKinds.All.Contains(request.Kind.Trim()))
            errors[nameof(request.Kind)] = ["Il tipo di contatto non è valido."];
        if (Clean(request.Company).Length > 180)
            errors[nameof(request.Company)] = ["L'azienda può contenere al massimo 180 caratteri."];
        if (Clean(request.Role).Length > 180)
            errors[nameof(request.Role)] = ["Il ruolo può contenere al massimo 180 caratteri."];
        if (Clean(request.Email).Length > 0 && (Clean(request.Email).Length > 254 || !InputRules.IsEmail(Clean(request.Email))))
            errors[nameof(request.Email)] = ["Inserisci un indirizzo email valido."];
        if (Clean(request.Phone).Length > 40)
            errors[nameof(request.Phone)] = ["Il telefono può contenere al massimo 40 caratteri."];
        if (Clean(request.ProfileUrl).Length > 0 && (Clean(request.ProfileUrl).Length > 500 || !InputRules.IsHttpUrl(Clean(request.ProfileUrl))))
            errors[nameof(request.ProfileUrl)] = ["Il link al profilo deve essere un URL http/https valido, massimo 500 caratteri."];
        if (Clean(request.Notes).Length > 4000)
            errors[nameof(request.Notes)] = ["Le note possono contenere al massimo 4000 caratteri."];
        if (request.LastContactOn is { Year: < 2000 or > 2100 })
            errors[nameof(request.LastContactOn)] = ["La data dell'ultimo contatto non è valida."];
        if (request.NextFollowUpOn is { Year: < 2000 or > 2100 })
            errors[nameof(request.NextFollowUpOn)] = ["La data del prossimo contatto non è valida."];

        return errors.Count == 0 ? null : errors;
    }
}