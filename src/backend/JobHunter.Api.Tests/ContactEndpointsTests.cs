using System.Net;
using System.Net.Http.Json;
using JobHunter.Api.Contracts;

namespace JobHunter.Api.Tests;

public sealed class ContactEndpointsTests : IClassFixture<JobHunterApiFactory>
{
    private const string Route = "/api/v1/contacts";
    private readonly JobHunterApiFactory _factory;
    private readonly HttpClient _client;

    public ContactEndpointsTests(JobHunterApiFactory factory)
    {
        _factory = factory;
        _client = factory.CreateAuthenticatedClient();
    }

    private static ContactRequest Valid(string name = "Giulia Rossi", string kind = "Recruiter", DateOnly? followUp = null) =>
        new(name, kind, "Acme", "Talent Acquisition", "giulia@example.com", "+39 333 0000000", "https://linkedin.com/in/giulia", "Ottima intesa.", new DateOnly(2026, 11, 1), followUp);

    private async Task<ContactResponse> Create(ContactRequest request)
    {
        var response = await _client.PostAsJsonAsync(Route, request);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<ContactResponse>())!;
    }

    [Theory]
    [InlineData("GET", Route)]
    [InlineData("GET", Route + "/summary")]
    [InlineData("POST", Route)]
    public async Task Contacts_RequireAToken(string method, string url)
    {
        var response = await _factory.CreateClient().SendAsync(new HttpRequestMessage(new HttpMethod(method), url));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Create_TrimsValues_AndCanBeReadBack()
    {
        var created = await Create(Valid("  Anna Bianchi  ") with { Company = "  Beta  " });

        var read = await _client.GetFromJsonAsync<ContactResponse>($"{Route}/{created.Id}");

        Assert.Equal("Anna Bianchi", read!.Name);
        Assert.Equal("Beta", read.Company);
        Assert.Equal(new DateOnly(2026, 11, 1), read.LastContactOn);
    }

    [Fact]
    public async Task Update_ChangesTheContact_AndTheUpdatedDate()
    {
        var created = await Create(Valid("Da Aggiornare"));

        var response = await _client.PutAsJsonAsync($"{Route}/{created.Id}", Valid("Aggiornato", "Referral", new DateOnly(2026, 12, 1)));
        var updated = await response.Content.ReadFromJsonAsync<ContactResponse>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("Aggiornato", updated!.Name);
        Assert.Equal("Referral", updated.Kind);
        Assert.Equal(new DateOnly(2026, 12, 1), updated.NextFollowUpOn);
        Assert.True(updated.UpdatedAt >= created.UpdatedAt);
    }

    [Fact]
    public async Task Delete_RemovesTheContact()
    {
        var created = await Create(Valid("Da Eliminare"));

        var deleted = await _client.DeleteAsync($"{Route}/{created.Id}");
        var read = await _client.GetAsync($"{Route}/{created.Id}");

        Assert.Equal(HttpStatusCode.NoContent, deleted.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, read.StatusCode);
    }

    [Fact]
    public async Task UnknownIds_AnswerNotFound()
    {
        var id = Guid.NewGuid();

        Assert.Equal(HttpStatusCode.NotFound, (await _client.GetAsync($"{Route}/{id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await _client.PutAsJsonAsync($"{Route}/{id}", Valid())).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await _client.DeleteAsync($"{Route}/{id}")).StatusCode);
    }

    public static TheoryData<string, ContactRequest> InvalidRequests() => new()
    {
        { "Name", new ContactRequest("  ", "Recruiter", null, null, null, null, null, null, null, null) },
        { "Name", new ContactRequest(new string('a', 181), "Recruiter", null, null, null, null, null, null, null, null) },
        { "Kind", new ContactRequest("A", "Boss", null, null, null, null, null, null, null, null) },
        { "Email", new ContactRequest("A", "Other", null, null, "not-an-email", null, null, null, null, null) },
        { "Phone", new ContactRequest("A", "Other", null, null, null, new string('1', 41), null, null, null, null) },
        { "ProfileUrl", new ContactRequest("A", "Other", null, null, null, null, "javascript:alert(1)", null, null, null) },
        { "Notes", new ContactRequest("A", "Other", null, null, null, null, null, new string('n', 4001), null, null) },
        { "NextFollowUpOn", new ContactRequest("A", "Other", null, null, null, null, null, null, null, new DateOnly(1900, 1, 1)) },
        { "LastContactOn", new ContactRequest("A", "Other", null, null, null, null, null, null, new DateOnly(2500, 1, 1), null) }
    };

    [Theory]
    [MemberData(nameof(InvalidRequests))]
    public async Task InvalidContacts_AreRejectedWithTheFieldName(string field, ContactRequest request)
    {
        var response = await _client.PostAsJsonAsync(Route, request);
        var problem = await response.Content.ReadFromJsonAsync<ValidationProblemBody>();

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.True(problem!.Errors.ContainsKey(field), $"expected an error for {field}");
    }

    [Fact]
    public async Task List_SearchesByNameCompanyAndFiltersByKind()
    {
        var unique = $"Zed{Guid.NewGuid():N}"[..12];
        await Create(Valid($"{unique} Uno", "Recruiter") with { Company = "Globex" });
        await Create(Valid($"{unique} Due", "Referral") with { Company = "Initech" });

        var byName = await _client.GetFromJsonAsync<PagedContactsResponse>($"{Route}?search={unique}");
        var byCompany = await _client.GetFromJsonAsync<PagedContactsResponse>($"{Route}?search=initech");
        var byKind = await _client.GetFromJsonAsync<PagedContactsResponse>($"{Route}?search={unique}&kind=Referral");

        Assert.Equal(2, byName!.TotalCount);
        Assert.Contains(byCompany!.Items, c => c.Name == $"{unique} Due");
        Assert.Single(byKind!.Items);
        Assert.Equal("Referral", byKind.Items[0].Kind);
    }

    [Fact]
    public async Task List_RejectsAnUnknownKind_AndClampsThePageSize()
    {
        Assert.Equal(HttpStatusCode.BadRequest, (await _client.GetAsync($"{Route}?kind=Boss")).StatusCode);

        var page = await _client.GetFromJsonAsync<PagedContactsResponse>($"{Route}?pageSize=5000");
        Assert.Equal(100, page!.PageSize);
    }

    [Fact]
    public async Task Summary_CountsDueFollowUps_AndListsTheNextOnesSoonestFirst()
    {
        var before = await _client.GetFromJsonAsync<ContactSummaryResponse>($"{Route}/summary");
        await Create(Valid("Late", followUp: new DateOnly(2001, 1, 1)));
        await Create(Valid("Far", followUp: new DateOnly(2099, 1, 1)));

        var after = await _client.GetFromJsonAsync<ContactSummaryResponse>($"{Route}/summary");

        Assert.Equal(before!.Total + 2, after!.Total);
        Assert.Equal(before.FollowUpsDue + 1, after.FollowUpsDue);
        Assert.True(after.NextFollowUps.Count <= 5);
        var dates = after.NextFollowUps.Select(c => c.NextFollowUpOn!.Value).ToList();
        Assert.Equal(dates.OrderBy(d => d), dates);
    }

    private sealed record ValidationProblemBody(Dictionary<string, string[]> Errors);
}
