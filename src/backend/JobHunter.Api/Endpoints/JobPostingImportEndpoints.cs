using JobHunter.Api.Contracts;
using JobHunter.Api.Infrastructure;
using JobHunter.Api.Infrastructure.JobPostings;

namespace JobHunter.Api.Endpoints;

/// <summary>
/// Turns the link or the text of a job posting into a draft application. Nothing is saved: the owner reviews the
/// draft in the dialog first.
/// </summary>
public static class JobPostingImportEndpoints
{
    public const string RateLimitPolicy = "job-import";
    public const int MaxTextLength = 20_000;

    /// <summary>
    /// Sites whose terms forbid automated access, or that show postings only after signing in. They are never
    /// contacted: the owner pastes the text of the posting instead.
    /// </summary>
    private static readonly string[] PasteOnlyHosts = ["linkedin.com", "lnkd.in", "indeed.", "glassdoor."];

    public static bool IsPasteOnly(Uri url) =>
        PasteOnlyHosts.Any(marker => url.Host.Contains(marker, StringComparison.OrdinalIgnoreCase));

    public static IEndpointRouteBuilder MapJobPostingImportEndpoints(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapPost("/api/v1/applications/import", async (
            JobPostingImportRequest request,
            IJobPageFetcher fetcher,
            ILoggerFactory loggerFactory,
            CancellationToken cancellationToken) =>
        {
            var urlText = request.Url?.Trim() ?? "";
            var text = request.Text?.Trim() ?? "";
            var errors = new Dictionary<string, string[]>();

            Uri? url = null;
            if (urlText.Length > 0)
            {
                if (urlText.Length > 1000 || !InputRules.IsHttpUrl(urlText) || !Uri.TryCreate(urlText, UriKind.Absolute, out url))
                    errors[nameof(request.Url)] = ["Inserisci il link completo dell'annuncio (http o https)."];
                else if (url.UserInfo.Length > 0)
                    errors[nameof(request.Url)] = ["Il link non può contenere nome utente o password."];
            }

            if (text.Length > MaxTextLength)
                errors[nameof(request.Text)] = [$"Il testo può contenere al massimo {MaxTextLength} caratteri."];
            if (urlText.Length == 0 && text.Length == 0)
                errors[nameof(request.Url)] = ["Incolla il link dell'annuncio oppure il suo testo."];
            if (errors.Count > 0) return Results.ValidationProblem(errors);

            // Pasted text wins: it is what the owner sees, and it never needs the network.
            if (text.Length > 0)
                return Results.Ok(ToResponse(JobPostingParser.ParseText(text, url), needsText: false, message: null));

            if (IsPasteOnly(url!))
            {
                var draft = JobPostingDraft.Empty with { Url = url!.ToString(), Source = JobPostingParser.SourceFor(url) };
                return Results.Ok(ToResponse(draft, needsText: true,
                    $"{draft.Source} non permette la lettura automatica degli annunci. Apri l'annuncio, copia il testo e incollalo qui sotto."));
            }

            string html;
            try
            {
                html = await fetcher.FetchHtmlAsync(url!, cancellationToken);
            }
            catch (JobPageException exception)
            {
                loggerFactory.CreateLogger("JobImport").LogInformation("Job posting at {Host} could not be read: {Reason}", url!.Host, exception.Message);
                return Results.Problem(title: exception.Message, statusCode: StatusCodes.Status422UnprocessableEntity);
            }

            var parsed = JobPostingParser.ParseHtml(html, url!);
            var nothingFound = parsed.Company.Length == 0 && parsed.Role.Length == 0;
            return Results.Ok(ToResponse(parsed, needsText: nothingFound,
                nothingFound ? "Non ho trovato i dati dell'annuncio in questa pagina. Copia il testo dell'annuncio e incollalo qui sotto." : null));
        })
        .RequireAuthorization()
        .RequireRateLimiting(RateLimitPolicy)
        .WithTags("Applications");

        return endpoints;
    }

    private static JobPostingImportResponse ToResponse(JobPostingDraft draft, bool needsText, string? message)
    {
        var found = new List<string>();
        if (draft.Company.Length > 0) found.Add("company");
        if (draft.Role.Length > 0) found.Add("role");
        if (draft.Location.Length > 0) found.Add("location");
        if (draft.SalaryRange.Length > 0) found.Add("salaryRange");
        return new JobPostingImportResponse(draft.Company, draft.Role, draft.Location, draft.SalaryRange, draft.Source,
            draft.Url, draft.Notes, found, needsText, message);
    }
}
