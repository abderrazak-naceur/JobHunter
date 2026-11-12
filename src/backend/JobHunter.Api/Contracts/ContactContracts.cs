namespace JobHunter.Api.Contracts;

public sealed record ContactRequest(
    string Name,
    string Kind,
    string? Company,
    string? Role,
    string? Email,
    string? Phone,
    string? ProfileUrl,
    string? Notes,
    DateOnly? LastContactOn,
    DateOnly? NextFollowUpOn);

public sealed record ContactResponse(
    Guid Id,
    string Name,
    string Kind,
    string Company,
    string Role,
    string Email,
    string Phone,
    string ProfileUrl,
    string Notes,
    DateOnly? LastContactOn,
    DateOnly? NextFollowUpOn,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public sealed record PagedContactsResponse(IReadOnlyList<ContactResponse> Items, int Page, int PageSize, int TotalCount);

public sealed record ContactSummaryResponse(int Total, int FollowUpsDue, IReadOnlyList<ContactResponse> NextFollowUps);