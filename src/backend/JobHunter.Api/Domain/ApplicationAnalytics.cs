using JobHunter.Api.Contracts;

namespace JobHunter.Api.Domain;

/// <summary>
/// Turns the applications and their status history into the numbers shown on the dashboard.
/// It works on plain objects so every rule can be tested without a database.
/// </summary>
public static class ApplicationAnalytics
{
    public const int WeeksShown = 12;
    public const string UnknownSource = "Non indicata";

    /// <summary>The stages an application moves through when things go well. Rejected and Withdrawn can happen at any point.</summary>
    private static readonly string[] Pipeline =
    [
        ApplicationStatuses.Applied, ApplicationStatuses.Screening, ApplicationStatuses.Interview, ApplicationStatuses.Offer
    ];

    /// <summary>Stages whose duration is worth reporting (the ones where the owner waits for something).</summary>
    private static readonly string[] TimedStages =
    [
        ApplicationStatuses.Saved, ApplicationStatuses.Applied, ApplicationStatuses.Screening, ApplicationStatuses.Interview
    ];

    private static int Rank(string status) => Array.IndexOf(Pipeline, status);

    public static ApplicationAnalyticsResponse Compute(IReadOnlyCollection<JobApplication> applications, DateTime nowUtc)
    {
        var today = DateOnly.FromDateTime(nowUtc);

        // Deepest pipeline stage each application ever reached (-1: never applied). Skipping a stage still counts for it.
        var reached = applications.ToDictionary(a => a.Id, a => DeepestStage(a));

        var funnel = Pipeline.Select((stage, index) =>
        {
            var count = applications.Count(a => reached[a.Id] >= index);
            return new FunnelStageResponse(stage, count);
        }).ToList();

        var applied = funnel[0].Count;
        var responded = applications.Count(a =>
            reached[a.Id] >= Rank(ApplicationStatuses.Screening) ||
            (reached[a.Id] >= 0 && a.Status == ApplicationStatuses.Rejected));

        var conversions = new List<ConversionResponse>();
        for (var i = 1; i < funnel.Count; i++)
            conversions.Add(new ConversionResponse(funnel[i - 1].Stage, funnel[i].Stage, funnel[i - 1].Count, funnel[i].Count));

        return new ApplicationAnalyticsResponse(
            applications.Count,
            applied,
            responded,
            applied == 0 ? null : Math.Round(100.0 * responded / applied, 1),
            WeeklyApplications(applications, today),
            funnel,
            conversions,
            AverageDaysInStage(applications, nowUtc),
            BySource(applications, reached));
    }

    private static int DeepestStage(JobApplication application)
    {
        var deepest = Rank(application.Status);
        foreach (var item in application.Events)
            deepest = Math.Max(deepest, Rank(item.ToStatus));
        return deepest;
    }

    /// <summary>Applications sent per week (weeks start on Monday), oldest first, always <see cref="WeeksShown"/> entries.</summary>
    private static List<WeekCountResponse> WeeklyApplications(IEnumerable<JobApplication> applications, DateOnly today)
    {
        var thisWeek = StartOfWeek(today);
        var weeks = Enumerable.Range(0, WeeksShown).Select(i => thisWeek.AddDays(-7 * (WeeksShown - 1 - i))).ToList();
        var counts = applications
            .Where(a => a.AppliedOn is not null)
            .GroupBy(a => StartOfWeek(a.AppliedOn!.Value))
            .ToDictionary(g => g.Key, g => g.Count());
        return weeks.Select(week => new WeekCountResponse(week, counts.GetValueOrDefault(week))).ToList();
    }

    private static DateOnly StartOfWeek(DateOnly date)
    {
        var offset = ((int)date.DayOfWeek + 6) % 7; // Monday = 0
        return date.AddDays(-offset);
    }

    /// <summary>
    /// Average days spent in each waiting stage, from the moment the application entered it until the next change.
    /// A stage still open counts up to now, unless the application was closed by a rejection or withdrawal.
    /// </summary>
    private static List<StageDurationResponse> AverageDaysInStage(IEnumerable<JobApplication> applications, DateTime nowUtc)
    {
        var spans = TimedStages.ToDictionary(stage => stage, _ => new List<double>());

        foreach (var application in applications)
        {
            var events = application.Events.OrderBy(e => e.At).ToList();
            for (var i = 0; i < events.Count; i++)
            {
                var stage = events[i].ToStatus;
                if (!spans.TryGetValue(stage, out var list)) continue;

                var isLast = i == events.Count - 1;
                var end = isLast ? nowUtc : events[i + 1].At;
                list.Add(Math.Max(0, (end - events[i].At).TotalDays));
            }
        }

        return TimedStages
            .Select(stage => new StageDurationResponse(
                stage,
                spans[stage].Count == 0 ? null : Math.Round(spans[stage].Average(), 1),
                spans[stage].Count))
            .ToList();
    }

    private static List<SourceStatsResponse> BySource(IEnumerable<JobApplication> applications, Dictionary<Guid, int> reached)
    {
        return applications
            .Where(a => reached[a.Id] >= 0) // only jobs actually applied for say anything about a source
            .GroupBy(a => string.IsNullOrWhiteSpace(a.Source) ? UnknownSource : a.Source.Trim(), StringComparer.OrdinalIgnoreCase)
            .Select(g => new SourceStatsResponse(
                g.Key,
                g.Count(),
                g.Count(a => reached[a.Id] >= Rank(ApplicationStatuses.Interview)),
                g.Count(a => reached[a.Id] >= Rank(ApplicationStatuses.Offer))))
            .OrderByDescending(s => s.Applications)
            .ThenBy(s => s.Source, StringComparer.OrdinalIgnoreCase)
            .ToList();
    }
}
