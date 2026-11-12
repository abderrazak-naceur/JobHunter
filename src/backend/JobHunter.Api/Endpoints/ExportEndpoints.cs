using System.Text;
using System.Text.Json;
using JobHunter.Api.Contracts;
using JobHunter.Api.Domain;
using JobHunter.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace JobHunter.Api.Endpoints;

/// <summary>
/// Download of the owner's own data. Credentials never leave the server: the admin account (and its password hash)
/// is deliberately not part of any export, and neither is the profile photo (it is a binary file).
/// </summary>
public static class ExportEndpoints
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web) { WriteIndented = true };

    public static readonly string[] CsvColumns =
    [
        "Azienda", "Ruolo", "Stato", "Fonte", "Link", "Località", "Retribuzione", "Contatto", "Email contatto",
        "Candidata il", "Prossimo passo", "Data prossimo passo", "Note", "Creata il", "Aggiornata il"
    ];

    public static IEndpointRouteBuilder MapExportEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/v1/export").WithTags("Export").RequireAuthorization();

        // Everything in one JSON file: a complete copy to keep as a backup.
        group.MapGet("/", async (JobHunterDbContext db, CancellationToken cancellationToken) =>
        {
            var applications = await db.JobApplications.AsNoTracking().Include(x => x.Events)
                .OrderBy(x => x.Company).ToListAsync(cancellationToken);
            var companies = await db.Companies.AsNoTracking().OrderBy(x => x.Name).ToListAsync(cancellationToken);
            var portfolioJson = await db.PortfolioProfiles.AsNoTracking()
                .Select(x => x.ContentJson).FirstOrDefaultAsync(cancellationToken);

            object? portfolio = PortfolioEndpoints.DefaultContent;
            if (portfolioJson is not null)
            {
                try { portfolio = JsonSerializer.Deserialize<JsonElement>(portfolioJson); }
                catch (JsonException) { /* a damaged document is exported as the default rather than failing the backup */ }
            }

            var export = new
            {
                exportedAt = DateTimeOffset.UtcNow,
                version = 1,
                portfolio,
                applications = applications.Select(ToExport).ToList(),
                companies = companies.Select(c => new CompanyResponse(
                    c.Id, c.Name, c.Website, c.CareersUrl, c.Location, c.Sector, c.Technologies, c.Priority, c.Notes,
                    c.Followed, c.CreatedAt, c.UpdatedAt)).ToList()
            };

            return Results.File(
                JsonSerializer.SerializeToUtf8Bytes(export, JsonOptions),
                "application/json",
                $"portfolio-backup-{DateTime.UtcNow:yyyyMMdd}.json");
        });

        // Applications as a spreadsheet (UTF-8 with BOM so Excel shows accents correctly).
        group.MapGet("/applications.csv", async (JobHunterDbContext db, CancellationToken cancellationToken) =>
        {
            var applications = await db.JobApplications.AsNoTracking().OrderBy(x => x.Company).ToListAsync(cancellationToken);
            var csv = BuildCsv(applications);
            var bytes = new UTF8Encoding(encoderShouldEmitUTF8Identifier: true).GetPreamble()
                .Concat(Encoding.UTF8.GetBytes(csv)).ToArray();
            return Results.File(bytes, "text/csv; charset=utf-8", $"candidature-{DateTime.UtcNow:yyyyMMdd}.csv");
        });

        return endpoints;
    }

    private static ApplicationDetailResponse ToExport(JobApplication a) => new(
        a.Id, a.Company, a.Role, a.Status, a.Source, a.Url, a.Location, a.SalaryRange, a.ContactName, a.ContactEmail,
        a.AppliedOn, a.NextStep, a.NextStepOn, a.Notes, a.CreatedAt, a.UpdatedAt,
        a.Events.OrderBy(e => e.At).Select(e => new ApplicationEventResponse(e.Id, e.At, e.FromStatus, e.ToStatus)).ToList());

    public static string BuildCsv(IEnumerable<JobApplication> applications)
    {
        var builder = new StringBuilder();
        builder.Append(string.Join(',', CsvColumns.Select(Cell))).Append("\r\n");
        foreach (var a in applications)
        {
            string[] row =
            [
                a.Company, a.Role, a.Status, a.Source, a.Url, a.Location, a.SalaryRange, a.ContactName, a.ContactEmail,
                a.AppliedOn?.ToString("yyyy-MM-dd") ?? "", a.NextStep, a.NextStepOn?.ToString("yyyy-MM-dd") ?? "", a.Notes,
                a.CreatedAt.ToString("yyyy-MM-dd"), a.UpdatedAt.ToString("yyyy-MM-dd")
            ];
            builder.Append(string.Join(',', row.Select(Cell))).Append("\r\n");
        }

        return builder.ToString();
    }

    /// <summary>
    /// Quotes a value for CSV. Text that a spreadsheet would run as a formula (starting with = + - @ or a tab/return)
    /// gets a leading apostrophe, so a pasted job description can never execute anything when the file is opened.
    /// </summary>
    public static string Cell(string? value)
    {
        var text = value ?? "";
        if (text.Length > 0 && "=+-@\t\r".Contains(text[0])) text = "'" + text;
        return "\"" + text.Replace("\"", "\"\"") + "\"";
    }
}
