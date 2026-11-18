using System.Net;
using System.Net.Http.Json;
using JobHunter.Api.Endpoints;

namespace JobHunter.Api.Tests;

public sealed class BlogEndpointsTests : IClassFixture<JobHunterApiFactory>
{
    private readonly HttpClient _anonymous;
    private readonly HttpClient _admin;

    public BlogEndpointsTests(JobHunterApiFactory factory)
    {
        _anonymous = factory.CreateClient();
        _admin = factory.CreateAuthenticatedClient();
    }

    private static BlogPostRequest Valid(string status = "Draft", string? slug = null) =>
        new("Clean Architecture con .NET", slug ?? $"dotnet-clean-architecture-{Guid.NewGuid():N}", "Una guida pratica.", "# Clean Architecture\n\nContenuto tecnico.", " .NET ",
            ["dotnet", "architecture"], null, "Clean Architecture .NET", "Guida pratica a Clean Architecture.", status);

    [Fact]
    public async Task AdminList_RequiresAuthentication()
    {
        var response = await _anonymous.GetAsync("/api/v1/admin/blog");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Draft_IsNotVisibleToAnonymousVisitors()
    {
        var create = await _admin.PostAsJsonAsync("/api/v1/admin/blog", Valid());
        Assert.Equal(HttpStatusCode.Created, create.StatusCode);
        var created = await create.Content.ReadFromJsonAsync<BlogPostResponse>();
        Assert.NotNull(created);

        var response = await _anonymous.GetAsync($"/api/v1/blog/{created.Slug}");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task PublishedArticle_IsPubliclyReadableBySlug()
    {
        var input = Valid("Published");
        var create = await _admin.PostAsJsonAsync("/api/v1/admin/blog", input);
        Assert.Equal(HttpStatusCode.Created, create.StatusCode);
        var created = await create.Content.ReadFromJsonAsync<BlogPostResponse>();
        Assert.NotNull(created);

        var article = await _anonymous.GetFromJsonAsync<BlogPostResponse>($"/api/v1/blog/{created.Slug}");
        Assert.NotNull(article);
        Assert.Equal("Published", article.Status);
        Assert.Equal("Clean Architecture con .NET", article.Title);
        Assert.Contains("dotnet", article.Tags);
    }

    [Fact]
    public async Task DuplicateSlug_ReturnsConflict()
    {
        await _admin.PostAsJsonAsync("/api/v1/admin/blog", Valid(slug: "shared-slug"));
        var response = await _admin.PostAsJsonAsync("/api/v1/admin/blog", Valid(slug: "shared-slug"));
        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task InvalidStatus_IsRejected()
    {
        var response = await _admin.PostAsJsonAsync("/api/v1/admin/blog", Valid() with { Status = "Live" });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task AdminCanDeleteArticle()
    {
        var create = await _admin.PostAsJsonAsync("/api/v1/admin/blog", Valid());
        var created = await create.Content.ReadFromJsonAsync<BlogPostResponse>();
        Assert.NotNull(created);

        var delete = await _admin.DeleteAsync($"/api/v1/admin/blog/{created.Id}");
        Assert.Equal(HttpStatusCode.NoContent, delete.StatusCode);
    }

    [Fact]
    public async Task BlogArticleImport_PreflightAllowsProductionFrontendOrigin()
    {
        using var request = new HttpRequestMessage(HttpMethod.Options, "/api/v1/admin/blog/import-url");
        request.Headers.Add("Origin", "https://zaknaceur.it");
        request.Headers.Add("Access-Control-Request-Method", "POST");
        request.Headers.Add("Access-Control-Request-Headers", "authorization,content-type");

        var response = await _anonymous.SendAsync(request);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal("https://zaknaceur.it", response.Headers.GetValues("Access-Control-Allow-Origin").Single());
        Assert.Contains("POST", response.Headers.GetValues("Access-Control-Allow-Methods").Single());
    }

}
