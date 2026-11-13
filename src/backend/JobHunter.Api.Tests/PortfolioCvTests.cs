using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using JobHunter.Api.Contracts;
using JobHunter.Api.Domain;
using JobHunter.Api.Endpoints;
using JobHunter.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace JobHunter.Api.Tests;

public sealed class PortfolioCvTests : IClassFixture<JobHunterApiFactory>
{
    private const string CvRoute = "/api/v1/portfolio/cv";
    private const string ContentRoute = "/api/v1/portfolio";
    private static readonly byte[] Pdf = Encoding.ASCII.GetBytes("%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF");

    private readonly JobHunterApiFactory _factory;
    private readonly HttpClient _anonymous;
    private readonly HttpClient _admin;

    public PortfolioCvTests(JobHunterApiFactory factory)
    {
        _factory = factory;
        _anonymous = factory.CreateClient();
        _admin = factory.CreateAuthenticatedClient();
    }

    private static ByteArrayContent PdfContent(byte[]? bytes = null)
    {
        var content = new ByteArrayContent(bytes ?? Pdf);
        content.Headers.ContentType = new MediaTypeHeaderValue("application/pdf");
        return content;
    }

    [Fact]
    public async Task Put_WithoutToken_ReturnsUnauthorized()
    {
        var response = await _anonymous.PutAsync(CvRoute, PdfContent());

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Delete_WithoutToken_ReturnsUnauthorized()
    {
        var response = await _anonymous.DeleteAsync(CvRoute);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Put_AcceptsPdfAndServesItAsAnAttachment()
    {
        await _admin.DeleteAsync(CvRoute);

        var put = await _admin.PutAsync(CvRoute, PdfContent());
        var body = await put.Content.ReadFromJsonAsync<CvResponse>();
        var get = await _anonymous.GetAsync(CvRoute);

        Assert.Equal(HttpStatusCode.OK, put.StatusCode);
        Assert.StartsWith(CvRoute + "?v=", body!.CvDownloadUrl);
        Assert.Equal(HttpStatusCode.OK, get.StatusCode);
        Assert.Equal("application/pdf", get.Content.Headers.ContentType!.MediaType);
        Assert.Equal(Pdf, await get.Content.ReadAsByteArrayAsync());
        Assert.Contains("attachment", get.Content.Headers.ContentDisposition!.DispositionType);
        Assert.Contains("curriculum-vitae.pdf", get.Content.Headers.ContentDisposition.ToString());
        Assert.Contains("nosniff", get.Headers.GetValues("X-Content-Type-Options"));
        Assert.Contains("public", get.Headers.CacheControl!.ToString());

        await _admin.DeleteAsync(CvRoute);
    }

    [Theory]
    [InlineData("<html><script>alert(1)</script></html>")]
    [InlineData("not a PDF")]
    [InlineData("")]
    public async Task Put_RejectsBodiesWithoutThePdfSignature(string text)
    {
        await _admin.DeleteAsync(CvRoute);
        var response = await _admin.PutAsync(CvRoute, PdfContent(Encoding.UTF8.GetBytes(text)));

        Assert.Equal(HttpStatusCode.UnsupportedMediaType, response.StatusCode);
        await _admin.DeleteAsync(CvRoute);
    }

    [Fact]
    public async Task Put_RejectsFilesOverTenMegabytes()
    {
        var tooLarge = new byte[PortfolioEndpoints.MaxCvBytes + 1];
        Pdf.AsSpan().CopyTo(tooLarge);

        var response = await _admin.PutAsync(CvRoute, PdfContent(tooLarge));

        Assert.Equal(HttpStatusCode.RequestEntityTooLarge, response.StatusCode);
    }

    [Fact]
    public async Task Put_ReplacesTheExistingPdfAndKeepsOneCvRecord()
    {
        await _admin.DeleteAsync(CvRoute);
        var first = Encoding.ASCII.GetBytes("%PDF-1.4\nfirst");
        var second = Encoding.ASCII.GetBytes("%PDF-1.7\nsecond");

        Assert.Equal(HttpStatusCode.OK, (await _admin.PutAsync(CvRoute, PdfContent(first))).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await _admin.PutAsync(CvRoute, PdfContent(second))).StatusCode);

        Assert.Equal(second, await _anonymous.GetByteArrayAsync(CvRoute));
        using var scope = _factory.Services.CreateScope();
        var count = await scope.ServiceProvider.GetRequiredService<JobHunterDbContext>()
            .PortfolioAssets.CountAsync(x => x.Kind == PortfolioAsset.CvKind);
        Assert.Equal(1, count);

        await _admin.DeleteAsync(CvRoute);
    }

    [Fact]
    public async Task PublicPortfolio_PrioritisesUploadedPdfAndRestoresManualLinkAfterDelete()
    {
        await _admin.DeleteAsync(CvRoute);
        var original = (await _anonymous.GetFromJsonAsync<PortfolioContentDto>(ContentRoute))!;
        var manualUrl = "https://example.com/curriculum.pdf";
        await _admin.PutAsJsonAsync(ContentRoute, original with { CvUrl = manualUrl });

        await _admin.PutAsync(CvRoute, PdfContent());
        var withUpload = (await _anonymous.GetFromJsonAsync<PortfolioContentDto>(ContentRoute))!;
        await _admin.DeleteAsync(CvRoute);
        var afterDelete = (await _anonymous.GetFromJsonAsync<PortfolioContentDto>(ContentRoute))!;

        Assert.Equal(manualUrl, withUpload.CvUrl);
        Assert.StartsWith(CvRoute + "?v=", withUpload.CvDownloadUrl);
        Assert.Equal(manualUrl, afterDelete.CvUrl);
        Assert.Null(afterDelete.CvDownloadUrl);
    }

    [Fact]
    public async Task Delete_WhenThereIsNoCv_StillSucceeds()
    {
        await _admin.DeleteAsync(CvRoute);

        var response = await _admin.DeleteAsync(CvRoute);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }
}
