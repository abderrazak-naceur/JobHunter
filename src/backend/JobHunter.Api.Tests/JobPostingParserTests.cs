using System.Net;
using JobHunter.Api.Infrastructure.JobPostings;

namespace JobHunter.Api.Tests;

public sealed class JobPostingParserTests
{
    private static readonly Uri CareersUrl = new("https://careers.acme.it/jobs/42");

    private static string Page(string jsonLd, string head = "") =>
        $"<html><head>{head}<script type=\"application/ld+json\">{jsonLd}</script></head><body>...</body></html>";

    [Fact]
    public void ReadsAStandardJobPosting()
    {
        var html = Page("""
            {
              "@context": "https://schema.org",
              "@type": "JobPosting",
              "title": "Senior .NET Developer",
              "hiringOrganization": { "@type": "Organization", "name": "Acme S.p.A." },
              "jobLocation": { "@type": "Place", "address": { "addressLocality": "Milano", "addressRegion": "Lombardia", "addressCountry": "IT" } },
              "baseSalary": { "@type": "MonetaryAmount", "currency": "EUR", "value": { "minValue": 45000, "maxValue": 55000, "unitText": "YEAR" } },
              "employmentType": "FULL_TIME",
              "validThrough": "2026-12-31T23:59:59Z"
            }
            """);

        var draft = JobPostingParser.ParseHtml(html, CareersUrl);

        Assert.Equal("Acme S.p.A.", draft.Company);
        Assert.Equal("Senior .NET Developer", draft.Role);
        Assert.Equal("Milano, Lombardia, IT", draft.Location);
        Assert.Equal("45.000 €–55.000 € / anno", draft.SalaryRange);
        Assert.Equal("Sito aziendale", draft.Source);
        Assert.Equal(CareersUrl.ToString(), draft.Url);
        Assert.Equal("Scadenza annuncio: 31/12/2026 · Tipo di contratto: Full time", draft.Notes);
    }

    [Fact]
    public void FindsThePostingInsideAGraph_AndIgnoresBrokenBlocks()
    {
        var html = "<script type='application/ld+json'>{ not json </script>" + Page("""
            { "@graph": [
                { "@type": "WebSite", "name": "Jobs" },
                { "@type": ["JobPosting"], "title": "Data Engineer", "hiringOrganization": "Beta Srl" }
            ] }
            """);

        var draft = JobPostingParser.ParseHtml(html, new Uri("https://boards.greenhouse.io/beta/jobs/1"));

        Assert.Equal("Beta Srl", draft.Company);
        Assert.Equal("Data Engineer", draft.Role);
        Assert.Equal("Greenhouse", draft.Source);
    }

    [Fact]
    public void CombinesSeveralLocations_AndMarksRemoteWork()
    {
        var html = Page("""
            [{ "@type": "JobPosting", "title": "Dev", "hiringOrganization": { "name": "Gamma" },
               "jobLocationType": "TELECOMMUTE",
               "jobLocation": [ { "address": { "addressLocality": "Roma" } }, { "address": { "addressLocality": "Torino" } }, { "address": { "addressLocality": "Roma" } } ] }]
            """);

        Assert.Equal("Roma / Torino (anche da remoto)", JobPostingParser.ParseHtml(html, CareersUrl).Location);
    }

    [Theory]
    [InlineData("""{ "currency": "EUR", "value": { "value": 40000, "unitText": "YEAR" } }""", "40.000 € / anno")]
    [InlineData("""{ "currency": "EUR", "value": { "minValue": "2500", "maxValue": "3000", "unitText": "MONTH" } }""", "2.500 €–3.000 € / mese")]
    [InlineData("""{ "currency": "USD", "value": { "minValue": 90000, "maxValue": 90000 } }""", "90.000 USD")]
    [InlineData("""{ "currency": "EUR", "value": 35000.5 }""", "35.000,5 €")]
    public void FormatsTheSalaryTheItalianWay(string salary, string expected)
    {
        var html = Page($$"""{ "@type": "JobPosting", "title": "Dev", "hiringOrganization": "X", "baseSalary": {{salary}} }""");

        Assert.Equal(expected, JobPostingParser.ParseHtml(html, CareersUrl).SalaryRange);
    }

    [Fact]
    public void LeavesTheSalaryEmpty_WhenThePostingHasNone()
    {
        var html = Page("""{ "@type": "JobPosting", "title": "Dev", "hiringOrganization": "X" }""");

        Assert.Equal("", JobPostingParser.ParseHtml(html, CareersUrl).SalaryRange);
    }

    [Fact]
    public void DecodesEntitiesAndRemovesTags()
    {
        var html = Page("""{ "@type": "JobPosting", "title": "<b>Sviluppatore</b> &amp; Analista", "hiringOrganization": { "name": "Caff&egrave; Srl" } }""");

        var draft = JobPostingParser.ParseHtml(html, CareersUrl);

        Assert.Equal("Sviluppatore & Analista", draft.Role);
        Assert.Equal("Caffè Srl", draft.Company);
    }

    [Fact]
    public void CutsOverlongValuesToTheFieldLimits()
    {
        var html = Page($$"""{ "@type": "JobPosting", "title": "{{new string('r', 500)}}", "hiringOrganization": "X" }""");

        Assert.Equal(180, JobPostingParser.ParseHtml(html, CareersUrl).Role.Length);
    }

    [Fact]
    public void WithoutStructuredData_UsesThePageTitle()
    {
        const string html = """
            <html><head>
              <meta property="og:title" content="Frontend Developer - Delta Tech | Careers">
              <meta property="og:site_name" content="Careers">
            </head></html>
            """;

        var draft = JobPostingParser.ParseHtml(html, CareersUrl);

        Assert.Equal("Frontend Developer", draft.Role);
        Assert.Equal("Delta Tech", draft.Company);
    }

    [Fact]
    public void WithoutStructuredData_UsesTheTitleTag_AndTheCompanySiteName()
    {
        const string html = "<html><head><title>Backend Engineer</title><meta content='Epsilon' property='og:site_name'></head></html>";

        var draft = JobPostingParser.ParseHtml(html, CareersUrl);

        Assert.Equal("Backend Engineer", draft.Role);
        Assert.Equal("Epsilon", draft.Company);
    }

    [Fact]
    public void APageWithNothingUseful_GivesAnEmptyDraft()
    {
        var draft = JobPostingParser.ParseHtml("<html><body>Ciao</body></html>", CareersUrl);

        Assert.Equal("", draft.Company);
        Assert.Equal("", draft.Role);
    }

    [Fact]
    public void ReadsTextCopiedFromLinkedIn()
    {
        const string text = """
            Senior .NET Developer
            Acme S.p.A. · Milano, Lombardia, Italia · 2 giorni fa · Oltre 100 candidati
            Ibrido   Tempo pieno

            Informazioni sull'offerta
            RAL 45.000 - 55.000 € in base all'esperienza.
            """;

        var draft = JobPostingParser.ParseText(text, new Uri("https://www.linkedin.com/jobs/view/123/"));

        Assert.Equal("Senior .NET Developer", draft.Role);
        Assert.Equal("Acme S.p.A.", draft.Company);
        Assert.Equal("Milano, Lombardia, Italia (ibrido)", draft.Location);
        Assert.Equal("45.000 - 55.000 €", draft.SalaryRange);
        Assert.Equal("LinkedIn", draft.Source);
        Assert.Equal("https://www.linkedin.com/jobs/view/123/", draft.Url);
    }

    [Fact]
    public void ReadsLabelledLines()
    {
        const string text = """
            Offerta di lavoro
            Posizione: Analista Programmatore Java
            Azienda: Zeta Consulting
            Sede di lavoro: Bologna
            Retribuzione: 35k-40k
            Modalità: full remote
            """;

        var draft = JobPostingParser.ParseText(text, null);

        Assert.Equal("Analista Programmatore Java", draft.Role);
        Assert.Equal("Zeta Consulting", draft.Company);
        Assert.Equal("Bologna (remoto)", draft.Location);
        Assert.Equal("35k-40k", draft.SalaryRange);
        Assert.Equal("", draft.Source);
    }

    [Fact]
    public void FindsAnUnlabelledSalary_OnlyOnALineThatTalksAboutPay()
    {
        const string text = """
            Product Owner
            Lavoriamo con 1.200 clienti in tutta Italia.
            Offriamo uno stipendio di 50.000 € lordi annui.
            """;

        Assert.Equal("50.000 €", JobPostingParser.ParseText(text, null).SalaryRange);
    }

    [Theory]
    [InlineData("https://www.linkedin.com/jobs/view/1", "LinkedIn")]
    [InlineData("https://it.indeed.com/viewjob?jk=1", "Indeed")]
    [InlineData("https://www.infojobs.it/offerta/1", "InfoJobs")]
    [InlineData("https://jobs.lever.co/acme/1", "Lever")]
    [InlineData("https://acme.wd3.myworkdayjobs.com/x", "Workday")]
    [InlineData("https://acme.jobs.personio.de/job/1", "Personio")]
    [InlineData("https://www.acme.it/lavora-con-noi", "Sito aziendale")]
    public void NamesTheSource(string url, string expected)
    {
        Assert.Equal(expected, JobPostingParser.SourceFor(new Uri(url)));
    }

    [Theory]
    [InlineData("8.8.8.8", true)]
    [InlineData("151.101.1.69", true)]
    [InlineData("2a00:1450:4002:402::200e", true)]
    [InlineData("127.0.0.1", false)]
    [InlineData("10.1.2.3", false)]
    [InlineData("172.16.0.1", false)]
    [InlineData("172.31.255.255", false)]
    [InlineData("192.168.1.1", false)]
    [InlineData("169.254.169.254", false)] // cloud metadata
    [InlineData("100.64.0.1", false)]
    [InlineData("0.0.0.0", false)]
    [InlineData("224.0.0.1", false)]
    [InlineData("::1", false)]
    [InlineData("fe80::1", false)]
    [InlineData("fd00::1", false)]
    [InlineData("::ffff:127.0.0.1", false)]
    [InlineData("::ffff:192.168.0.1", false)]
    public void OnlyPublicAddressesCanBeOpened(string address, bool expected)
    {
        Assert.Equal(expected, JobPageFetcher.IsPublicAddress(IPAddress.Parse(address)));
    }
}
