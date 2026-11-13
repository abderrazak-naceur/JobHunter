namespace JobHunter.Api.Contracts;

public sealed record PortfolioLinkDto(string Label, string Url);

public sealed record SkillGroupDto(string Title, IReadOnlyList<string> Skills);

public sealed record ExperienceDto(string Company, string Role, string Period, string Description, IReadOnlyList<string>? Highlights);

public sealed record ProjectDto(string Name, string Description, IReadOnlyList<string> Technologies, string? Url);

public sealed record StatDto(string Value, string Label);

public sealed record EducationDto(string Institution, string Degree, string Period, string Description);

public sealed record CertificationDto(string Name, string Issuer, string Year, string? Url);

public sealed record LanguageDto(string Name, string Level);

public sealed record PhotoResponse(string PhotoUrl);

public sealed record CvResponse(string CvDownloadUrl);

public sealed record PortfolioContentDto(
    string Name,
    string Role,
    string Tagline,
    string Summary,
    string Location,
    string WorkMode,
    string? Email,
    string? CvUrl,
    IReadOnlyList<PortfolioLinkDto> Links,
    IReadOnlyList<SkillGroupDto> SkillGroups,
    IReadOnlyList<ExperienceDto> Experiences,
    IReadOnlyList<ProjectDto> Projects,
    IReadOnlyList<StatDto>? Stats = null,
    string? PhotoUrl = null,
    IReadOnlyList<EducationDto>? Education = null,
    IReadOnlyList<CertificationDto>? Certifications = null,
    IReadOnlyList<LanguageDto>? Languages = null,
    string? CvDownloadUrl = null);
