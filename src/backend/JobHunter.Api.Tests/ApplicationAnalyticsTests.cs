using System.Net;
using System.Net.Http.Json;
using JobHunter.Api.Contracts;
using JobHunter.Api.Domain;

namespace JobHunter.Api.Tests;

public sealed class ApplicationAnalyticsTests
{
    // Thursday 12 November 2026; its week starts on Monday 9 November.
    private static readonly DateTime Now = new(2026, 11, 12, 12, 0, 0, DateTimeKind.Utc);

    private static JobApplication App(string status, string source = "LinkedIn", DateOnly? appliedOn = null, params (string? From, string To, int DaysAgo)[] history)
    {
        var application = new JobApplication { Status = status, Source = source, AppliedOn = appliedOn };
        foreach (var step in history)
            application.Events.Add(new ApplicationEvent { ApplicationId = application.Id, FromStatus = step.From, ToStatus = step.To, At = Now.AddDays(-step.DaysAgo) });
        return application;
    }

    [Fact]
    public void NoApplications_GivesZerosAndNoResponseRate()
    {
        var result = ApplicationAnalytics.Compute([], Now);

        Assert.Equal(0, result.Total);
        Assert.Null(result.ResponseRatePercent);
        Assert.Equal(ApplicationAnalytics.WeeksShown, result.Weekly.Count);
        Assert.All(result.Weekly, week => Assert.Equal(0, week.Count));
        Assert.All(result.Funnel, stage => Assert.Equal(0, stage.Count));
        Assert.Empty(result.BySource);
    }

    [Fact]
    public void Weekly_CountsApplicationsPerMondayStartingWeek_OldestFirst()
    {
        var result = ApplicationAnalytics.Compute(
        [
            App("Applied", appliedOn: new DateOnly(2026, 11, 9)),   // Monday of this week
            App("Applied", appliedOn: new DateOnly(2026, 11, 12)),  // same week
            App("Applied", appliedOn: new DateOnly(2026, 11, 8)),   // Sunday: previous week
            App("Applied", appliedOn: new DateOnly(2020, 1, 1)),    // outside the window
            App("Saved")                                            // never applied
        ], Now);

        Assert.Equal(new DateOnly(2026, 11, 9), result.Weekly[^1].WeekStart);
        Assert.Equal(2, result.Weekly[^1].Count);
        Assert.Equal(new DateOnly(2026, 11, 2), result.Weekly[^2].WeekStart);
        Assert.Equal(1, result.Weekly[^2].Count);
        Assert.Equal(3, result.Weekly.Sum(w => w.Count));
        Assert.True(result.Weekly.Zip(result.Weekly.Skip(1), (a, b) => a.WeekStart < b.WeekStart).All(x => x));
    }

    [Fact]
    public void Funnel_CountsEveryApplicationThatReachedAStage_EvenIfItSkippedOnes()
    {
        var result = ApplicationAnalytics.Compute(
        [
            App("Saved"),
            App("Applied", history: [(null, "Applied", 5)]),
            App("Screening", history: [(null, "Applied", 9), ("Applied", "Screening", 4)]),
            App("Offer", history: [(null, "Offer", 1)]) // jumped straight to the end
        ], Now);

        Assert.Equal([3, 2, 1, 1], result.Funnel.Select(f => f.Count));
        Assert.Equal(3, result.Applied);
        Assert.Equal(new ConversionResponse("Applied", "Screening", 3, 2), result.Conversions[0]);
        Assert.Equal(new ConversionResponse("Screening", "Interview", 2, 1), result.Conversions[1]);
    }

    [Fact]
    public void AnApplicationThatReachedAStageAndWasThenRejected_StillCountsForTheFunnel()
    {
        var result = ApplicationAnalytics.Compute(
        [
            App("Rejected", history: [(null, "Applied", 20), ("Applied", "Interview", 10), ("Interview", "Rejected", 2)])
        ], Now);

        Assert.Equal([1, 1, 1, 0], result.Funnel.Select(f => f.Count));
    }

    [Fact]
    public void ResponseRate_IncludesInterviewsAndRejections_ButNotSilence()
    {
        var result = ApplicationAnalytics.Compute(
        [
            App("Applied", history: [(null, "Applied", 30)]),                                      // silence
            App("Applied", history: [(null, "Applied", 30)]),                                      // silence
            App("Rejected", history: [(null, "Applied", 30), ("Applied", "Rejected", 20)]),        // answered: no
            App("Interview", history: [(null, "Applied", 30), ("Applied", "Interview", 10)]),      // answered: yes
            App("Rejected", history: [(null, "Saved", 30), ("Saved", "Rejected", 20)])             // never applied
        ], Now);

        Assert.Equal(4, result.Applied);
        Assert.Equal(2, result.Responded);
        Assert.Equal(50.0, result.ResponseRatePercent);
    }

    [Fact]
    public void TimeInStage_AveragesClosedSpans_AndCountsOpenOnesUntilNow()
    {
        var result = ApplicationAnalytics.Compute(
        [
            // Applied for 6 days (10 -> 4 days ago), then Screening for 4 days and still open.
            App("Screening", history: [(null, "Applied", 10), ("Applied", "Screening", 4)]),
            // Applied for 2 days (6 -> 4), then rejected: Rejected is not a timed stage.
            App("Rejected", history: [(null, "Applied", 6), ("Applied", "Rejected", 4)])
        ], Now);

        var applied = result.TimeInStage.Single(s => s.Stage == "Applied");
        var screening = result.TimeInStage.Single(s => s.Stage == "Screening");
        var interview = result.TimeInStage.Single(s => s.Stage == "Interview");

        Assert.Equal(4.0, applied.AverageDays);
        Assert.Equal(2, applied.Samples);
        Assert.Equal(4.0, screening.AverageDays);
        Assert.Null(interview.AverageDays);
        Assert.Equal(0, interview.Samples);
    }

    [Fact]
    public void BySource_RanksSourcesAndIgnoresJobsNeverAppliedFor()
    {
        var result = ApplicationAnalytics.Compute(
        [
            App("Interview", "LinkedIn", history: [(null, "Applied", 9), ("Applied", "Interview", 3)]),
            App("Applied", "linkedin ", history: [(null, "Applied", 9)]),
            App("Offer", "Referral", history: [(null, "Applied", 9), ("Applied", "Offer", 3)]),
            App("Applied", "", history: [(null, "Applied", 9)]),
            App("Saved", "Indeed")
        ], Now);

        Assert.Equal("LinkedIn", result.BySource[0].Source);
        Assert.Equal(new SourceStatsResponse("LinkedIn", 2, 1, 0), result.BySource[0]);
        Assert.Contains(new SourceStatsResponse("Referral", 1, 1, 1), result.BySource);
        Assert.Contains(result.BySource, s => s.Source == ApplicationAnalytics.UnknownSource && s.Applications == 1);
        Assert.DoesNotContain(result.BySource, s => s.Source == "Indeed");
    }
}

public sealed class ApplicationAnalyticsEndpointTests : IClassFixture<JobHunterApiFactory>
{
    private readonly JobHunterApiFactory _factory;

    public ApplicationAnalyticsEndpointTests(JobHunterApiFactory factory) => _factory = factory;

    [Fact]
    public async Task Analytics_RequiresAToken()
    {
        var response = await _factory.CreateClient().GetAsync("/api/v1/applications/analytics");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Analytics_ReflectsStatusChangesMadeThroughTheApi()
    {
        var client = _factory.CreateAuthenticatedClient();
        var request = new ApplicationRequest("Acme", "Dev", "Applied", "Referral", "", "", "", "", "", DateOnly.FromDateTime(DateTime.UtcNow), "", null, "");
        var created = await (await client.PostAsJsonAsync("/api/v1/applications", request)).Content.ReadFromJsonAsync<ApplicationDetailResponse>();
        await client.PutAsJsonAsync($"/api/v1/applications/{created!.Id}", request with { Status = "Interview" });

        var analytics = await client.GetFromJsonAsync<ApplicationAnalyticsResponse>("/api/v1/applications/analytics");

        Assert.True(analytics!.Applied >= 1);
        Assert.True(analytics.Funnel.Single(f => f.Stage == "Interview").Count >= 1);
        Assert.Contains(analytics.BySource, s => s.Source == "Referral" && s.Interviews >= 1);
        Assert.Equal(ApplicationAnalytics.WeeksShown, analytics.Weekly.Count);
    }
}
