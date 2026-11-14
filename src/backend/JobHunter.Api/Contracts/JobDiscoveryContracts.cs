namespace JobHunter.Api.Contracts;

public sealed record SearchProfileRequest(
    string Name,
    string RoleKeywords,
    string SkillKeywords,
    string? Location,
    decimal? MinimumAnnualSalary,
    string WorkMode,
    int MinimumMatchScore,
    bool IsActive);

public sealed record SearchProfileResponse(
    Guid Id,
    string Name,
    string RoleKeywords,
    string SkillKeywords,
    string Location,
    decimal? MinimumAnnualSalary,
    string WorkMode,
    int MinimumMatchScore,
    bool IsActive,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public sealed record JobSourceRequest(
    string CompanyName,
    string Provider,
    string BoardIdentifier,
    string? CareersUrl,
    bool IsEnabled);

public sealed record JobSourceResponse(
    Guid Id,
    string CompanyName,
    string Provider,
    string BoardIdentifier,
    string CareersUrl,
    bool IsEnabled,
    DateTimeOffset? LastCheckedAt,
    DateTimeOffset? LastSuccessfulAt,
    string LastError,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public sealed record JobListingResponse(
    Guid Id,
    string ExternalId,
    string Title,
    string CompanyName,
    string Provider,
    string Location,
    string WorkMode,
    string SalaryText,
    string Description,
    string SourceUrl,
    string ApplyUrl,
    DateTimeOffset? PublishedAt,
    DateTimeOffset? SourceUpdatedAt,
    DateTimeOffset FirstSeenAt,
    DateTimeOffset LastSeenAt,
    int MatchScore,
    IReadOnlyList<string> MatchedKeywords);

public sealed record PagedJobListingsResponse(
    IReadOnlyList<JobListingResponse> Items,
    int Page,
    int PageSize,
    int TotalCount);

public sealed record JobSearchRunResponse(
    Guid Id,
    DateTimeOffset StartedAt,
    DateTimeOffset? CompletedAt,
    string Status,
    int FoundCount,
    int NewCount,
    int UpdatedCount,
    int ErrorCount,
    string Summary);
