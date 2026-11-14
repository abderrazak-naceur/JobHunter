using System.Globalization;
using System.Text.RegularExpressions;
using JobHunter.Api.Contracts;
using JobHunter.Api.Domain;
using JobHunter.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace JobHunter.Api.Infrastructure.JobDiscovery;

public sealed class JobDiscoveryService(
    JobHunterDbContext db,
    IJobBoardClient boardClient,
    ILogger<JobDiscoveryService> logger)
{
    public async Task<JobSearchRunResponse> SearchAsync(CancellationToken cancellationToken)
    {
        var run = new JobSearchRun();
        db.JobSearchRuns.Add(run);
        await db.SaveChangesAsync(cancellationToken);

        var sources = await db.JobSources.Where(x => x.IsEnabled).OrderBy(x => x.CompanyName).ToListAsync(cancellationToken);
        foreach (var source in sources)
        {
            source.LastCheckedAt = DateTimeOffset.UtcNow;
            try
            {
                var postings = await boardClient.FetchAsync(source, cancellationToken);
                var existing = await db.JobListings
                    .Where(x => x.JobSourceId == source.Id)
                    .ToDictionaryAsync(x => x.ExternalId, cancellationToken);

                foreach (var posting in postings)
                {
                    if (string.IsNullOrWhiteSpace(posting.ExternalId) || string.IsNullOrWhiteSpace(posting.Title) ||
                        string.IsNullOrWhiteSpace(posting.SourceUrl)) continue;

                    run.FoundCount++;
                    if (!existing.TryGetValue(posting.ExternalId, out var listing))
                    {
                        listing = new JobListing
                        {
                            JobSourceId = source.Id,
                            ExternalId = posting.ExternalId,
                            FirstSeenAt = DateTimeOffset.UtcNow
                        };
                        db.JobListings.Add(listing);
                        existing.Add(posting.ExternalId, listing);
                        run.NewCount++;
                    }
                    else
                    {
                        run.UpdatedCount++;
                    }

                    listing.Title = Limit(posting.Title, 180);
                    listing.CompanyName = Limit(source.CompanyName, 180);
                    listing.Location = Limit(posting.Location, 180);
                    listing.WorkMode = Limit(posting.WorkMode, 30);
                    listing.SalaryText = Limit(posting.SalaryText, 180);
                    listing.Description = posting.Description;
                    listing.SourceUrl = Limit(posting.SourceUrl, 1000);
                    listing.ApplyUrl = Limit(string.IsNullOrWhiteSpace(posting.ApplyUrl) ? posting.SourceUrl : posting.ApplyUrl, 1000);
                    listing.PublishedAt = posting.PublishedAt;
                    listing.SourceUpdatedAt = posting.SourceUpdatedAt;
                    listing.LastSeenAt = DateTimeOffset.UtcNow;
                }

                source.LastSuccessfulAt = DateTimeOffset.UtcNow;
                source.LastError = string.Empty;
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                throw;
            }
            catch (Exception exception)
            {
                source.LastError = exception is HttpRequestException
                    ? "La fonte non ha risposto correttamente."
                    : "Impossibile leggere gli annunci da questa fonte.";
                run.ErrorCount++;
                logger.LogWarning(exception, "Job discovery source {SourceId} failed ({Provider}).", source.Id, source.Provider);
            }
        }

        run.CompletedAt = DateTimeOffset.UtcNow;
        run.Status = sources.Count == 0 ? "NoSources" : run.ErrorCount == sources.Count ? "Failed" : run.ErrorCount > 0 ? "Partial" : "Completed";
        run.Summary = sources.Count == 0
            ? "Nessuna fonte abilitata. Aggiungi almeno una board Lever o Greenhouse."
            : $"{sources.Count} fonti controllate; {run.NewCount} nuove offerte, {run.UpdatedCount} aggiornate, {run.ErrorCount} errori.";
        await db.SaveChangesAsync(cancellationToken);
        return ToResponse(run);
    }

    public async Task<PagedJobListingsResponse> GetJobsAsync(
        string? search,
        DateOnly? publishedFrom,
        DateOnly? publishedTo,
        int minimumMatchScore,
        int page,
        int pageSize,
        CancellationToken cancellationToken)
    {
        var query = db.JobListings.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLowerInvariant();
            query = query.Where(x => x.Title.ToLower().Contains(term) ||
                                     x.CompanyName.ToLower().Contains(term) ||
                                     x.Location.ToLower().Contains(term) ||
                                     x.Description.ToLower().Contains(term));
        }
        if (publishedFrom.HasValue)
        {
            var from = new DateTimeOffset(publishedFrom.Value.ToDateTime(TimeOnly.MinValue), TimeSpan.Zero);
            query = query.Where(x => x.PublishedAt >= from);
        }
        if (publishedTo.HasValue)
        {
            var until = new DateTimeOffset(publishedTo.Value.AddDays(1).ToDateTime(TimeOnly.MinValue), TimeSpan.Zero);
            query = query.Where(x => x.PublishedAt < until);
        }

        var profile = await db.SearchProfiles.AsNoTracking()
            .Where(x => x.IsActive).OrderByDescending(x => x.UpdatedAt).FirstOrDefaultAsync(cancellationToken);
        var sources = await db.JobSources.AsNoTracking().ToDictionaryAsync(x => x.Id, cancellationToken);
        var entities = await query.ToListAsync(cancellationToken);
        var threshold = minimumMatchScore >= 0 ? Math.Clamp(minimumMatchScore, 0, 100) : profile?.MinimumMatchScore ?? 0;

        var items = entities.Select(x =>
        {
            sources.TryGetValue(x.JobSourceId, out var source);
            var score = MatchScore(x, profile, out var matched);
            return new JobListingResponse(
                x.Id, x.ExternalId, x.Title, x.CompanyName, source?.Provider ?? string.Empty,
                x.Location, x.WorkMode, x.SalaryText, x.Description, x.SourceUrl, x.ApplyUrl,
                x.PublishedAt, x.SourceUpdatedAt, x.FirstSeenAt, x.LastSeenAt, score, matched);
        })
        .Where(x => x.MatchScore >= threshold)
        .Where(x => profile is null || !profile.MinimumAnnualSalary.HasValue || ParseSalary(x.SalaryText) is not decimal salary ||
                    salary >= profile.MinimumAnnualSalary.Value)
        .Where(x => profile is null || profile.WorkMode == "Any" || string.IsNullOrWhiteSpace(x.WorkMode) ||
                    (profile.WorkMode == "RemoteOrHybrid"
                        ? x.WorkMode is "Remote" or "Hybrid"
                        : x.WorkMode.Equals(profile.WorkMode, StringComparison.OrdinalIgnoreCase)))
        .OrderByDescending(x => x.PublishedAt.HasValue)
        .ThenByDescending(x => x.PublishedAt)
        .ThenByDescending(x => x.FirstSeenAt)
        .ToList();

        var currentPage = Math.Max(1, page);
        var size = Math.Clamp(pageSize, 1, 100);
        return new PagedJobListingsResponse(items.Skip((currentPage - 1) * size).Take(size).ToList(), currentPage, size, items.Count);
    }

    private static int MatchScore(JobListing listing, JobSearchProfile? profile, out IReadOnlyList<string> matched)
    {
        matched = [];
        if (profile is null) return 0;
        var roleTerms = Split(profile.RoleKeywords);
        var skillTerms = Split(profile.SkillKeywords);
        var title = listing.Title.ToLowerInvariant();
        var description = listing.Description.ToLowerInvariant();
        var foundRoles = roleTerms.Where(x => title.Contains(x, StringComparison.OrdinalIgnoreCase)).ToList();
        var foundSkills = skillTerms.Where(x => title.Contains(x, StringComparison.OrdinalIgnoreCase) ||
                                                  description.Contains(x, StringComparison.OrdinalIgnoreCase)).ToList();
        var score = roleTerms.Count == 0 ? 0 : foundRoles.Count > 0 ? 55 : 0;
        if (skillTerms.Count > 0)
            score += (int)Math.Round(35d * foundSkills.Count / skillTerms.Count, MidpointRounding.AwayFromZero);
        if (!string.IsNullOrWhiteSpace(profile.Location) &&
            listing.Location.Contains(profile.Location, StringComparison.OrdinalIgnoreCase))
            score += 10;
        matched = foundRoles.Concat(foundSkills).Distinct(StringComparer.OrdinalIgnoreCase).ToList();
        return Math.Min(100, score);
    }

    private static decimal? ParseSalary(string value)
    {
        var match = Regex.Match(value, @"\d{1,3}(?:[.,\s]\d{3})+|\d{4,7}", RegexOptions.CultureInvariant);
        if (!match.Success) return null;
        var digits = new string(match.Value.Where(char.IsDigit).ToArray());
        return decimal.TryParse(digits, NumberStyles.Number, CultureInfo.InvariantCulture, out var result) ? result : null;
    }

    private static List<string> Split(string value) => value
        .Split([',', ';', '\n', '\r'], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
        .Select(x => x.ToLowerInvariant())
        .Where(x => x.Length > 1)
        .Distinct()
        .ToList();

    private static string Limit(string value, int length) => value.Length <= length ? value : value[..length];

    private static JobSearchRunResponse ToResponse(JobSearchRun run) =>
        new(run.Id, run.StartedAt, run.CompletedAt, run.Status, run.FoundCount,
            run.NewCount, run.UpdatedCount, run.ErrorCount, run.Summary);
}
