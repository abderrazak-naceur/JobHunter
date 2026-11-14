using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using JobHunter.Api.Contracts;
using JobHunter.Api.Domain;
using JobHunter.Api.Endpoints;
using JobHunter.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace JobHunter.Api.Tests;

public sealed class PortfolioPhotoTests : IClassFixture<JobHunterApiFactory>
{
    private const string PhotoRoute = "/api/v1/portfolio/photo";
    private const string ContentRoute = "/api/v1/portfolio";

    private static readonly byte[] Png = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 1, 2, 3, 4];
    private static readonly byte[] Jpeg = [0xFF, 0xD8, 0xFF, 0xE0, 9, 9, 9];
    private static readonly byte[] Webp = [.. "RIFF"u8, 0, 0, 0, 0, .. "WEBP"u8, 7, 7];

    private readonly JobHunterApiFactory _factory;
    private readonly HttpClient _anonymous;
    private readonly HttpClient _admin;

    public PortfolioPhotoTests(JobHunterApiFactory factory)
    {
        _factory = factory;
        _anonymous = factory.CreateClient();
        _admin = factory.CreateAuthenticatedClient();
    }

    private static ByteArrayContent Image(byte[] bytes, string declaredType = "image/png")
    {
        var content = new ByteArrayContent(bytes);
        content.Headers.ContentType = new MediaTypeHeaderValue(declaredType);
        return content;
    }

    [Fact]
    public async Task Put_WithoutToken_ReturnsUnauthorized()
    {
        var response = await _anonymous.PutAsync(PhotoRoute, Image(Png));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Delete_WithoutToken_ReturnsUnauthorized()
    {
        var response = await _anonymous.DeleteAsync(PhotoRoute);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Theory]
    [InlineData("png", "image/png")]
    [InlineData("jpeg", "image/jpeg")]
    [InlineData("webp", "image/webp")]
    public async Task Put_AcceptsRealImages_AndServesThemPublicly(string kind, string expectedType)
    {
        var bytes = kind switch { "png" => Png, "jpeg" => Jpeg, _ => Webp };

        var put = await _admin.PutAsync(PhotoRoute, Image(bytes, "application/octet-stream"));
        var body = (await put.Content.ReadFromJsonAsync<PhotoResponse>())!;
        var get = await _anonymous.GetAsync(PhotoRoute);

        Assert.Equal(HttpStatusCode.OK, put.StatusCode);
        Assert.StartsWith(PortfolioEndpoints.PhotoPath + "?v=", body.PhotoUrl);
        Assert.Equal(HttpStatusCode.OK, get.StatusCode);
        Assert.Equal(expectedType, get.Content.Headers.ContentType!.MediaType);
        Assert.Equal(bytes, await get.Content.ReadAsByteArrayAsync());
        Assert.Contains("nosniff", get.Headers.GetValues("X-Content-Type-Options"));
        Assert.Contains("public", get.Headers.CacheControl!.ToString());
    }

    [Fact]
    public async Task Put_UsesTheRealContentType_NotTheDeclaredOne()
    {
        // An HTML/script payload that claims to be a PNG must be refused.
        var html = System.Text.Encoding.UTF8.GetBytes("<html><script>alert(1)</script></html>");

        var response = await _admin.PutAsync(PhotoRoute, Image(html, "image/png"));

        Assert.Equal(HttpStatusCode.UnsupportedMediaType, response.StatusCode);
    }

    [Theory]
    [InlineData("<svg xmlns='http://www.w3.org/2000/svg'><script>alert(1)</script></svg>")]
    [InlineData("GIF89a")]
    [InlineData("")]
    public async Task Put_RejectsSvgGifAndEmptyBodies(string text)
    {
        var response = await _admin.PutAsync(PhotoRoute, Image(System.Text.Encoding.UTF8.GetBytes(text), "image/svg+xml"));

        Assert.Equal(HttpStatusCode.UnsupportedMediaType, response.StatusCode);
    }

    [Fact]
    public async Task Put_RejectsFilesOverTwoMegabytes()
    {
        var tooBig = new byte[PortfolioEndpoints.MaxPhotoBytes + 1];
        Png.CopyTo(tooBig, 0);

        var response = await _admin.PutAsync(PhotoRoute, Image(tooBig));

        Assert.Equal(HttpStatusCode.RequestEntityTooLarge, response.StatusCode);
    }

    [Fact]
    public async Task Put_AcceptsAFileOfExactlyTwoMegabytes()
    {
        var exact = new byte[PortfolioEndpoints.MaxPhotoBytes];
        Png.CopyTo(exact, 0);

        var response = await _admin.PutAsync(PhotoRoute, Image(exact));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Put_ReplacesThePhoto_AndKeepsASingleRow()
    {
        await _admin.PutAsync(PhotoRoute, Image(Png));
        await _admin.PutAsync(PhotoRoute, Image(Jpeg));

        var served = await _anonymous.GetByteArrayAsync(PhotoRoute);
        using var scope = _factory.Services.CreateScope();
        var rows = await scope.ServiceProvider.GetRequiredService<JobHunterDbContext>().PortfolioAssets.CountAsync();

        Assert.Equal(Jpeg, served);
        Assert.Equal(1, rows);
    }

    [Fact]
    public async Task PublicContent_PointsToTheUploadedPhoto_UntilItIsDeleted()
    {
        await _admin.PutAsync(PhotoRoute, Image(Png));
        var withPhoto = await _anonymous.GetFromJsonAsync<PortfolioContentDto>(ContentRoute);

        var delete = await _admin.DeleteAsync(PhotoRoute);
        var afterDelete = await _anonymous.GetFromJsonAsync<PortfolioContentDto>(ContentRoute);
        var gone = await _anonymous.GetAsync(PhotoRoute);

        Assert.StartsWith(PortfolioEndpoints.PhotoPath, withPhoto!.PhotoUrl);
        Assert.Equal(HttpStatusCode.NoContent, delete.StatusCode);
        Assert.Null(afterDelete!.PhotoUrl);
        Assert.Equal(HttpStatusCode.NotFound, gone.StatusCode);
    }

    [Fact]
    public async Task Delete_WhenThereIsNoPhoto_StillSucceeds()
    {
        await _admin.DeleteAsync(PhotoRoute);

        var response = await _admin.DeleteAsync(PhotoRoute);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task SavingContent_WithTheDerivedPhotoAddress_DoesNotStoreIt()
    {
        await _admin.PutAsync(PhotoRoute, Image(Png));
        var published = (await _anonymous.GetFromJsonAsync<PortfolioContentDto>(ContentRoute))!;

        // The editor sends back exactly what it received.
        var save = await _admin.PutAsJsonAsync(ContentRoute, published);
        await _admin.DeleteAsync(PhotoRoute);
        var afterDelete = await _anonymous.GetFromJsonAsync<PortfolioContentDto>(ContentRoute);

        Assert.Equal(HttpStatusCode.OK, save.StatusCode);
        Assert.Null(afterDelete!.PhotoUrl);
    }

    [Fact]
    public async Task UploadedPhoto_TakesPrecedenceOverAManualPhotoUrl()
    {
        await _admin.DeleteAsync(PhotoRoute); // other tests in this class share the database

        var content = (await _anonymous.GetFromJsonAsync<PortfolioContentDto>(ContentRoute))! with { PhotoUrl = "https://example.com/manual.jpg" };
        await _admin.PutAsJsonAsync(ContentRoute, content);
        var manual = await _anonymous.GetFromJsonAsync<PortfolioContentDto>(ContentRoute);

        await _admin.PutAsync(PhotoRoute, Image(Png));
        var uploaded = await _anonymous.GetFromJsonAsync<PortfolioContentDto>(ContentRoute);
        await _admin.DeleteAsync(PhotoRoute);
        var back = await _anonymous.GetFromJsonAsync<PortfolioContentDto>(ContentRoute);

        Assert.Equal("https://example.com/manual.jpg", manual!.PhotoUrl);
        Assert.StartsWith(PortfolioEndpoints.PhotoPath, uploaded!.PhotoUrl);
        Assert.Equal("https://example.com/manual.jpg", back!.PhotoUrl);
    }

    [Theory]
    [InlineData(new byte[] { 0xFF, 0xD8, 0xFF }, "image/jpeg")]
    [InlineData(new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A }, "image/png")]
    [InlineData(new byte[] { 0x89, 0x50, 0x4E, 0x47 }, null)]
    [InlineData(new byte[] { 0xFF, 0xD8 }, null)]
    [InlineData(new byte[0], null)]
    public void DetectImageType_RecognisesSignatures(byte[] data, string? expected)
    {
        Assert.Equal(expected, PortfolioEndpoints.DetectImageType(data));
    }
}

public sealed class DefaultPortfolioContentTests
{
    [Fact]
    public void BundledDefaultContent_PassesTheSameValidationAsSavedContent()
    {
        var (_, errors) = PortfolioEndpoints.Validate(PortfolioEndpoints.DefaultContent);

        Assert.True(errors.Count == 0, "Default content is invalid: " + string.Join("; ", errors.Select(e => $"{e.Key}: {e.Value[0]}")));
    }

    [Fact]
    public void BundledDefaultContent_HasTheOwnersIdentityAndExperience()
    {
        var content = PortfolioEndpoints.DefaultContent;

        Assert.Equal("Abderrazak Naceur", content.Name);
        Assert.NotEmpty(content.Experiences);
        Assert.NotEmpty(content.SkillGroups);
        Assert.NotEmpty(content.Stats!);
    }

    [Fact]
    public void BundledDefaultContent_DoesNotPublishPrivateDetails()
    {
        var json = System.Text.Json.JsonSerializer.Serialize(PortfolioEndpoints.DefaultContent);

        Assert.DoesNotContain("1987", json);
        Assert.DoesNotContain("3924294504", json);
    }
}
