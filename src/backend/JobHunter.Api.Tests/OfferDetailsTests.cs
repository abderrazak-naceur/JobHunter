using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using JobHunter.Api.Contracts;

namespace JobHunter.Api.Tests;

public sealed class OfferDetailsTests : IClassFixture<JobHunterApiFactory>
{
    private const string Route = "/api/v1/applications";
    private readonly HttpClient _client;

    public OfferDetailsTests(JobHunterApiFactory factory) => _client = factory.CreateAuthenticatedClient();

    private static ApplicationRequest Request(OfferDto? offer) =>
        new("Offerta Srl", "Senior Developer", "Offer", "", "", "Milano", "", "", "", null, "", null, "", offer);

    [Fact]
    public async Task OfferTerms_AreSaved_Trimmed_AndReturnedInListAndDetail()
    {
        var offer = new OfferDto(55_000.50m, 4_000m, "  Buoni pasto, assicurazione  ", 3, new DateOnly(2026, 11, 30));

        var created = await (await _client.PostAsJsonAsync(Route, Request(offer))).Content.ReadFromJsonAsync<ApplicationDetailResponse>();
        var detail = await _client.GetFromJsonAsync<ApplicationDetailResponse>($"{Route}/{created!.Id}");
        var list = await _client.GetFromJsonAsync<PagedApplicationsResponse>($"{Route}?status=Offer&pageSize=100");

        var expected = offer with { Benefits = "Buoni pasto, assicurazione" };
        Assert.Equal(expected, created.Offer);
        Assert.Equal(expected, detail!.Offer);
        Assert.Equal(expected, list!.Items.Single(x => x.Id == created.Id).Offer);
    }

    [Fact]
    public async Task OfferTerms_CanBeChanged_AndCleared()
    {
        var created = await (await _client.PostAsJsonAsync(Route, Request(new OfferDto(50_000m, null, "", 2, null))))
            .Content.ReadFromJsonAsync<ApplicationDetailResponse>();

        var updated = await (await _client.PutAsJsonAsync($"{Route}/{created!.Id}", Request(new OfferDto(60_000m, 5_000m, "Auto", 5, null))))
            .Content.ReadFromJsonAsync<ApplicationDetailResponse>();
        var cleared = await (await _client.PutAsJsonAsync($"{Route}/{created.Id}", Request(null)))
            .Content.ReadFromJsonAsync<ApplicationDetailResponse>();

        Assert.Equal(new OfferDto(60_000m, 5_000m, "Auto", 5, null), updated!.Offer);
        Assert.Equal(new OfferDto(null, null, "", null, null), cleared!.Offer);
    }

    [Fact]
    public async Task ClientsThatDoNotSendAnOffer_KeepWorking()
    {
        // The request shape used before offer terms existed: no "offer" property at all.
        var response = await _client.PostAsJsonAsync(Route, new
        {
            company = "Vecchio Client",
            role = "Dev",
            status = "Applied"
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(JsonValueKind.Null, body.GetProperty("offer").GetProperty("grossAnnual").ValueKind);
    }

    public static TheoryData<string, OfferDto> InvalidOffers() => new()
    {
        { "Offer.GrossAnnual", new OfferDto(-1m, null, null, null, null) },
        { "Offer.GrossAnnual", new OfferDto(10_000_001m, null, null, null, null) },
        { "Offer.Bonus", new OfferDto(null, -5m, null, null, null) },
        { "Offer.Benefits", new OfferDto(null, null, new string('b', 1001), null, null) },
        { "Offer.RemoteDaysPerWeek", new OfferDto(null, null, null, 6, null) },
        { "Offer.RemoteDaysPerWeek", new OfferDto(null, null, null, -1, null) },
        { "Offer.DecisionBy", new OfferDto(null, null, null, null, new DateOnly(1999, 12, 31)) }
    };

    [Theory]
    [MemberData(nameof(InvalidOffers))]
    public async Task InvalidOfferTerms_AreRejectedWithTheFieldName(string field, OfferDto offer)
    {
        var response = await _client.PostAsJsonAsync(Route, Request(offer));
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.True(problem.GetProperty("errors").TryGetProperty(field, out _), $"expected an error for {field}");
    }

    [Fact]
    public async Task TheBackup_IncludesTheOfferTerms()
    {
        await _client.PostAsJsonAsync(Route, Request(new OfferDto(70_000m, null, "Smart working", 4, null)) with { Company = "Backup Offerta" });

        var json = JsonDocument.Parse(await _client.GetStringAsync("/api/v1/export")).RootElement;
        var exported = json.GetProperty("applications").EnumerateArray().First(a => a.GetProperty("company").GetString() == "Backup Offerta");

        Assert.Equal(70_000m, exported.GetProperty("offer").GetProperty("grossAnnual").GetDecimal());
        Assert.Equal(4, exported.GetProperty("offer").GetProperty("remoteDaysPerWeek").GetInt32());
    }
}
