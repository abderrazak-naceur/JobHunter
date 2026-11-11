namespace JobHunter.Api.Contracts;

public sealed record CompanyRequest(
    string Name,
    string? Website,
    string CareersUrl,
    string? Location,
    string? Sector,
    string? Technologies,
    string Priority,
    string? Notes,
    bool Followed);

public sealed record CompanyResponse(
    Guid Id,
    string Name,
    string Website,
    string CareersUrl,
    string Location,
    string Sector,
    string Technologies,
    string Priority,
    string Notes,
    bool Followed,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public sealed record PagedCompaniesResponse(
    IReadOnlyList<CompanyResponse> Items,
    int Page,
    int PageSize,
    int TotalCount);
