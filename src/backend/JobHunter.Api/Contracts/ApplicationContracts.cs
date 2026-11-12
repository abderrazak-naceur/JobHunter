namespace JobHunter.Api.Contracts;

public sealed record ApplicationRequest(
    string Company,
    string Role,
    string Status,
    string? Source,
    string? Url,
    string? Location,
    string? SalaryRange,
    string? ContactName,
    string? ContactEmail,
    DateOnly? AppliedOn,
    string? NextStep,
    DateOnly? NextStepOn,
    string? Notes);

public sealed record ApplicationResponse(
    Guid Id,
    string Company,
    string Role,
    string Status,
    string Source,
    string Url,
    string Location,
    string SalaryRange,
    string ContactName,
    string ContactEmail,
    DateOnly? AppliedOn,
    string NextStep,
    DateOnly? NextStepOn,
    string Notes,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public sealed record ApplicationEventResponse(Guid Id, DateTime At, string? FromStatus, string ToStatus);

/// <summary>Same fields as <see cref="ApplicationResponse"/> plus the status history, newest first.</summary>
public sealed record ApplicationDetailResponse(
    Guid Id,
    string Company,
    string Role,
    string Status,
    string Source,
    string Url,
    string Location,
    string SalaryRange,
    string ContactName,
    string ContactEmail,
    DateOnly? AppliedOn,
    string NextStep,
    DateOnly? NextStepOn,
    string Notes,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    IReadOnlyList<ApplicationEventResponse> Events);

public sealed record PagedApplicationsResponse(IReadOnlyList<ApplicationResponse> Items, int Page, int PageSize, int TotalCount);

public sealed record UpcomingStepResponse(Guid Id, string Company, string Role, string NextStep, DateOnly NextStepOn);

public sealed record ApplicationSummaryResponse(int Total, IReadOnlyDictionary<string, int> ByStatus, IReadOnlyList<UpcomingStepResponse> Upcoming);
