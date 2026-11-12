using System.Net;
using System.Net.Http.Json;
using JobHunter.Api.Contracts;
using JobHunter.Api.Domain;
using JobHunter.Api.Endpoints;
using JobHunter.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace JobHunter.Api.Tests;

/// <summary>Needs its own database so "nothing saved yet" is not affected by the other portfolio tests.</summary>
public sealed class PortfolioDefaultContentTests : IClassFixture<JobHunterApiFactory>
{
    private readonly HttpClient _anonymous;

    public PortfolioDefaultContentTests(JobHunterApiFactory factory) => _anonymous = factory.CreateClient();

    [Fact]
    public async Task Get_BeforeAnythingIsSaved_ReturnsTheDefaultContent()
    {
        var content = await _anonymous.GetFromJsonAsync<PortfolioContentDto>("/api/v1/portfolio");

        Assert.NotNull(content);
        Assert.Equal(PortfolioEndpoints.DefaultContent.Role, content.Role);
        Assert.NotEmpty(content.SkillGroups);
    }
}

public sealed class PortfolioEndpointsTests : IClassFixture<JobHunterApiFactory>
{
    private const string Route = "/api/v1/portfolio";
    private readonly JobHunterApiFactory _factory;
    private readonly HttpClient _anonymous;
    private readonly HttpClient _admin;

    public PortfolioEndpointsTests(JobHunterApiFactory factory)
    {
        _factory = factory;
        _anonymous = factory.CreateClient();
        _admin = factory.CreateAuthenticatedClient();
    }

    private static PortfolioContentDto Valid(string name = "Mario Rossi") => new(
        name, "Senior .NET Developer", "Slogan", "Presentazione.", "Milano", "Remote",
        "mario@example.com", "https://example.com/cv.pdf",
        [new("GitHub", "https://github.com/mario")],
        [new("Backend", ["C#", "ASP.NET Core"])],
        [new("Acme", "Developer", "2020 – oggi", "Lavoro svolto.", ["Risultato 1"])],
        [new("Sito", "Descrizione", ["React"], "https://example.com")]);

    [Fact]
    public async Task Put_WithoutToken_ReturnsUnauthorized()
    {
        var response = await _anonymous.PutAsJsonAsync(Route, Valid());

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Put_SavesContent_ThatAnonymousVisitorsCanRead()
    {
        var put = await _admin.PutAsJsonAsync(Route, Valid("Saved Name"));
        var published = await _anonymous.GetFromJsonAsync<PortfolioContentDto>(Route);

        Assert.Equal(HttpStatusCode.OK, put.StatusCode);
        Assert.NotNull(published);
        Assert.Equal("Saved Name", published.Name);
        Assert.Equal("mario@example.com", published.Email);
        Assert.Equal("Acme", Assert.Single(published.Experiences).Company);
        Assert.Equal(["C#", "ASP.NET Core"], Assert.Single(published.SkillGroups).Skills);
    }

    [Fact]
    public async Task Put_ReplacesTheContent_AndKeepsASingleRow()
    {
        await _admin.PutAsJsonAsync(Route, Valid("First"));
        await _admin.PutAsJsonAsync(Route, Valid("Second"));

        var published = await _anonymous.GetFromJsonAsync<PortfolioContentDto>(Route);
        using var scope = _factory.Services.CreateScope();
        var rows = await scope.ServiceProvider.GetRequiredService<JobHunterDbContext>().PortfolioProfiles.CountAsync();

        Assert.Equal("Second", published!.Name);
        Assert.Equal(1, rows);
    }

    [Fact]
    public async Task Put_TrimsTextAndDropsBlankListItems()
    {
        var request = Valid() with
        {
            Name = "  Mario Rossi  ",
            Email = "   ",
            CvUrl = "",
            SkillGroups = [new("  Backend ", ["  C#  ", "", "   "])]
        };

        var response = await _admin.PutAsJsonAsync(Route, request);
        var saved = (await response.Content.ReadFromJsonAsync<PortfolioContentDto>())!;

        Assert.Equal("Mario Rossi", saved.Name);
        Assert.Null(saved.Email);
        Assert.Null(saved.CvUrl);
        Assert.Equal("Backend", saved.SkillGroups[0].Title);
        Assert.Equal(["C#"], saved.SkillGroups[0].Skills);
    }

    [Fact]
    public async Task Get_IsPubliclyCacheableForAShortTime()
    {
        var response = await _anonymous.GetAsync(Route);

        Assert.Contains("public", response.Headers.CacheControl!.ToString());
        Assert.Equal(TimeSpan.FromSeconds(60), response.Headers.CacheControl!.MaxAge);
    }

    [Fact]
    public async Task Get_ServesDefaults_WhenTheStoredDocumentIsCorrupted()
    {
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<JobHunterDbContext>();
            var profile = await db.PortfolioProfiles.FirstOrDefaultAsync();
            if (profile is null) db.PortfolioProfiles.Add(profile = new PortfolioProfile());
            profile.ContentJson = "{ this is not json";
            await db.SaveChangesAsync();
        }

        var response = await _anonymous.GetAsync(Route);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var content = await response.Content.ReadFromJsonAsync<PortfolioContentDto>();
        Assert.Equal(PortfolioEndpoints.DefaultContent.Name, content!.Name);
    }

    [Fact]
    public async Task Put_SavesStats_AndTrimsThem()
    {
        var request = Valid() with { Stats = [new("  10+ ", " Anni di esperienza "), new("50", "Progetti")] };

        await _admin.PutAsJsonAsync(Route, request);
        var published = await _anonymous.GetFromJsonAsync<PortfolioContentDto>(Route);

        Assert.Equal([new StatDto("10+", "Anni di esperienza"), new StatDto("50", "Progetti")], published!.Stats);
    }

    [Fact]
    public async Task Put_SavesThePhotoUrl_AndTreatsBlankAsNone()
    {
        await _admin.PutAsJsonAsync(Route, Valid() with { PhotoUrl = " https://example.com/me.jpg " });
        var withPhoto = await _anonymous.GetFromJsonAsync<PortfolioContentDto>(Route);

        await _admin.PutAsJsonAsync(Route, Valid() with { PhotoUrl = "  " });
        var withoutPhoto = await _anonymous.GetFromJsonAsync<PortfolioContentDto>(Route);

        Assert.Equal("https://example.com/me.jpg", withPhoto!.PhotoUrl);
        Assert.Null(withoutPhoto!.PhotoUrl);
    }

    [Fact]
    public async Task Get_ReturnsAnEmptyStatsList_ForContentSavedBeforeStatsExisted()
    {
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<JobHunterDbContext>();
            var profile = await db.PortfolioProfiles.FirstOrDefaultAsync();
            if (profile is null) db.PortfolioProfiles.Add(profile = new PortfolioProfile());
            profile.ContentJson = """{"name":"Old","role":"Dev","tagline":"","summary":"s","location":"","workMode":"","email":null,"cvUrl":null,"links":[],"skillGroups":[],"experiences":[],"projects":[]}""";
            await db.SaveChangesAsync();
        }

        var published = await _anonymous.GetFromJsonAsync<PortfolioContentDto>(Route);

        Assert.Equal("Old", published!.Name);
        Assert.NotNull(published.Stats);
        Assert.Empty(published.Stats);
    }

    public static TheoryData<string, PortfolioContentDto> InvalidContent() => new()
    {
        { "PhotoUrl", Valid() with { PhotoUrl = "javascript:alert(1)" } },
        { "PhotoUrl", Valid() with { PhotoUrl = "/me.jpg" } },
        { "Stats[0].Value", Valid() with { Stats = [new("", "Anni")] } },
        { "Stats[0].Label", Valid() with { Stats = [new("10+", "  ")] } },
        { "Stats[0].Value", Valid() with { Stats = [new(new string('9', 21), "Anni")] } },
        { "Stats", Valid() with { Stats = Enumerable.Range(0, 5).Select(i => new StatDto($"{i}", "x")).ToList() } },
        { "Name", Valid() with { Name = "  " } },
        { "Name", Valid() with { Name = new string('a', 121) } },
        { "Role", Valid() with { Role = "" } },
        { "Summary", Valid() with { Summary = "" } },
        { "Summary", Valid() with { Summary = new string('s', 2001) } },
        { "Email", Valid() with { Email = "not-an-email" } },
        { "Email", Valid() with { Email = "a@b" } },
        { "CvUrl", Valid() with { CvUrl = "javascript:alert(1)" } },
        { "CvUrl", Valid() with { CvUrl = "/cv.pdf" } },
        { "Links[0].Url", Valid() with { Links = [new("X", "javascript:alert(1)")] } },
        { "Links[0].Url", Valid() with { Links = [new("X", "data:text/html,hi")] } },
        { "Links[0].Label", Valid() with { Links = [new("", "https://example.com")] } },
        { "Links", Valid() with { Links = Enumerable.Range(0, 11).Select(i => new PortfolioLinkDto($"L{i}", "https://example.com")).ToList() } },
        { "SkillGroups[0].Title", Valid() with { SkillGroups = [new("", ["C#"])] } },
        { "SkillGroups[0].Skills", Valid() with { SkillGroups = [new("Backend", [new string('x', 61)])] } },
        { "Experiences[0].Company", Valid() with { Experiences = [new("", "Dev", "2020", "", null)] } },
        { "Experiences[0].Period", Valid() with { Experiences = [new("Acme", "Dev", "", "", null)] } },
        { "Projects[0].Url", Valid() with { Projects = [new("P", "", [], "javascript:alert(1)")] } },
        { "Projects[0].Name", Valid() with { Projects = [new("", "", [], null)] } },
        { "Projects", Valid() with { Projects = Enumerable.Range(0, 31).Select(i => new ProjectDto($"P{i}", "", [], null)).ToList() } },
    };

    [Theory]
    [MemberData(nameof(InvalidContent))]
    public async Task Put_WithInvalidContent_ReturnsValidationProblemForField(string field, PortfolioContentDto content)
    {
        var response = await _admin.PutAsJsonAsync(Route, content);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
        Assert.True(problem.GetProperty("errors").TryGetProperty(field, out _), $"Expected a validation error for '{field}'.");
    }

    [Fact]
    public async Task Put_WithInvalidContent_DoesNotChangeWhatIsPublished()
    {
        await _admin.PutAsJsonAsync(Route, Valid("Stable"));

        await _admin.PutAsJsonAsync(Route, Valid() with { Name = "" });
        var published = await _anonymous.GetFromJsonAsync<PortfolioContentDto>(Route);

        Assert.Equal("Stable", published!.Name);
    }
}
