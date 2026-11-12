using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using JobHunter.Api.Contracts;
using JobHunter.Api.Domain;
using JobHunter.Api.Endpoints;

namespace JobHunter.Api.Tests;

public sealed class ExportTests : IClassFixture<JobHunterApiFactory>
{
    private readonly JobHunterApiFactory _factory;

    public ExportTests(JobHunterApiFactory factory) => _factory = factory;

    [Theory]
    [InlineData("/api/v1/export")]
    [InlineData("/api/v1/export/applications.csv")]
    public async Task Exports_RequireAToken(string url)
    {
        var response = await _factory.CreateClient().GetAsync(url);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task FullExport_ContainsTheOwnersData_AndNeverTheCredentials()
    {
        var client = _factory.CreateAuthenticatedClient();
        var request = new ApplicationRequest("Backup Srl", "Dev", "Applied", "Referral", "", "", "", "", "",
            new DateOnly(2026, 11, 3), "", null, "");
        (await client.PostAsJsonAsync("/api/v1/applications", request)).EnsureSuccessStatusCode();
        (await client.PostAsJsonAsync("/api/v1/companies",
            new CompanyRequest("Export Spa", "https://example.com", "https://example.com/jobs", null, null, null, "Alta", null, true)))
            .EnsureSuccessStatusCode();

        (await client.PostAsJsonAsync("/api/v1/contacts", new ContactRequest("Mario Recruiter", "Recruiter", "Acme", null, null, null, null, null, null, null))).EnsureSuccessStatusCode();
        var response = await client.GetAsync("/api/v1/export");
        var text = await response.Content.ReadAsStringAsync();
        var json = JsonDocument.Parse(text).RootElement;

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Contains("attachment", response.Content.Headers.ContentDisposition!.ToString());
        Assert.Contains("portfolio-backup-", response.Content.Headers.ContentDisposition!.FileNameStar ?? response.Content.Headers.ContentDisposition.FileName);
        Assert.Equal(1, json.GetProperty("version").GetInt32());
        Assert.Contains(json.GetProperty("applications").EnumerateArray(), a => a.GetProperty("company").GetString() == "Backup Srl");
        Assert.Contains(json.GetProperty("companies").EnumerateArray(), c => c.GetProperty("name").GetString() == "Export Spa");
        Assert.Contains(json.GetProperty("contacts").EnumerateArray(), c => c.GetProperty("name").GetString() == "Mario Recruiter");
        Assert.True(json.GetProperty("portfolio").TryGetProperty("name", out _));

        // The history of the application travels with it.
        var exported = json.GetProperty("applications").EnumerateArray().First(a => a.GetProperty("company").GetString() == "Backup Srl");
        Assert.Equal("Applied", exported.GetProperty("events")[0].GetProperty("toStatus").GetString());

        // Nothing secret: no hash, no signing key, no password.
        Assert.DoesNotContain("pbkdf2", text, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain(JobHunterApiFactory.SigningKey, text);
        Assert.DoesNotContain(JobHunterApiFactory.AdminPassword, text);
    }

    [Fact]
    public async Task CsvExport_HasAHeaderRow_AndOneRowPerApplication()
    {
        var client = _factory.CreateAuthenticatedClient();
        var request = new ApplicationRequest("Csv, \"Quoted\" Srl", "Dev", "Offer", "", "", "Milano", "", "", "",
            null, "", null, "line one\nline two");
        (await client.PostAsJsonAsync("/api/v1/applications", request)).EnsureSuccessStatusCode();

        var response = await client.GetAsync("/api/v1/export/applications.csv");
        var bytes = await response.Content.ReadAsByteArrayAsync();
        var text = Encoding.UTF8.GetString(bytes);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("text/csv", response.Content.Headers.ContentType!.MediaType);
        Assert.Equal([0xEF, 0xBB, 0xBF], bytes.Take(3)); // BOM, so Excel reads accents correctly
        Assert.Contains("\"Azienda\",\"Ruolo\",\"Stato\"", text);
        Assert.Contains("\"Csv, \"\"Quoted\"\" Srl\"", text);
        Assert.Contains("\"line one\nline two\"", text);
    }

    [Theory]
    [InlineData("=HYPERLINK(\"http://evil\")", "\"'=HYPERLINK(\"\"http://evil\"\")\"")]
    [InlineData("+1+1", "\"'+1+1\"")]
    [InlineData("-2", "\"'-2\"")]
    [InlineData("@SUM(A1)", "\"'@SUM(A1)\"")]
    [InlineData("plain", "\"plain\"")]
    [InlineData("", "\"\"")]
    public void Cell_QuotesValues_AndNeutralisesSpreadsheetFormulas(string value, string expected)
    {
        Assert.Equal(expected, ExportEndpoints.Cell(value));
    }

    [Fact]
    public void BuildCsv_WritesDatesAsIsoAndHandlesMissingOnes()
    {
        var application = new JobApplication { Company = "Acme", Role = "Dev", AppliedOn = new DateOnly(2026, 11, 3) };

        var csv = ExportEndpoints.BuildCsv([application]);
        var lines = csv.TrimEnd().Split("\r\n");

        Assert.Equal(2, lines.Length);
        Assert.Contains("\"2026-11-03\"", lines[1]);
        Assert.Equal(ExportEndpoints.CsvColumns.Length, lines[0].Split("\",\"").Length);
    }
}
