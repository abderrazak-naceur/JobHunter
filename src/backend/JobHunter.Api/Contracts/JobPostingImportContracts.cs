namespace JobHunter.Api.Contracts;

/// <summary>The link of a job posting, its pasted text, or both (the text wins; the link is kept as reference).</summary>
public sealed record JobPostingImportRequest(string? Url, string? Text);

/// <summary>
/// A draft application read from a posting. <c>Found</c> lists the fields that were filled
/// (company, role, location, salaryRange). <c>NeedsText</c> asks the owner to paste the text of the posting.
/// </summary>
public sealed record JobPostingImportResponse(
    string Company,
    string Role,
    string Location,
    string SalaryRange,
    string Source,
    string Url,
    string Notes,
    IReadOnlyList<string> Found,
    bool NeedsText,
    string? Message);
