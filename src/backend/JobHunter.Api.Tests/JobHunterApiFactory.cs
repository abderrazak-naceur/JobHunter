using System.Data;
using System.Net.Http.Headers;
using JobHunter.Api.Infrastructure;
using JobHunter.Api.Infrastructure.Auth;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace JobHunter.Api.Tests;

/// <summary>
/// Boots the API in-process with an isolated in-memory SQLite database per factory instance.
/// The Npgsql registration from Program.cs is replaced so no PostgreSQL server is needed.
/// </summary>
public class JobHunterApiFactory : WebApplicationFactory<Program>
{
    public const string AdminUsername = "admin";
    public const string AdminPassword = "correct horse battery staple";
    public const string SigningKey = "test-signing-key-test-signing-key-0123456789";

    // Low iteration count keeps the test suite fast; production uses PasswordHasher.DefaultIterations.
    private static readonly string AdminPasswordHash = PasswordHasher.Hash(AdminPassword, iterations: 1_000);

    private readonly SqliteConnection _connection = new("DataSource=:memory:");

    /// <summary>High by default so unrelated tests are never throttled; overridden by the rate limit tests.</summary>
    protected virtual int LoginPermitLimit => 1000;

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        if (_connection.State != ConnectionState.Open) _connection.Open();

        builder.UseEnvironment("Testing");
        builder.UseSetting("ConnectionStrings:DefaultConnection", "Host=unused;Database=unused");
        builder.UseSetting("Admin:Username", AdminUsername);
        builder.UseSetting("Admin:PasswordHash", AdminPasswordHash);
        builder.UseSetting("Jwt:SigningKey", SigningKey);
        builder.UseSetting("RateLimiting:LoginPermitLimit", LoginPermitLimit.ToString());

        builder.ConfigureServices(services =>
        {
            // AddDbContext registers the options plus (in EF Core 9+) an options-configuration
            // service holding the Npgsql setup. Remove every registration tied to our DbContext.
            var dbContextRegistrations = services
                .Where(d => d.ServiceType == typeof(JobHunterDbContext)
                         || d.ServiceType == typeof(DbContextOptions<JobHunterDbContext>)
                         || d.ServiceType == typeof(DbContextOptions)
                         || (d.ServiceType.IsGenericType
                             && d.ServiceType.GenericTypeArguments.Contains(typeof(JobHunterDbContext))))
                .ToList();
            foreach (var descriptor in dbContextRegistrations)
                services.Remove(descriptor);

            services.AddDbContext<JobHunterDbContext>(options => options.UseSqlite(_connection));

            using var provider = services.BuildServiceProvider();
            using var scope = provider.CreateScope();
            scope.ServiceProvider.GetRequiredService<JobHunterDbContext>().Database.EnsureCreated();
        });
    }

    /// <summary>A client already signed in as the admin (token issued directly, without calling the login endpoint).</summary>
    public HttpClient CreateAuthenticatedClient()
    {
        var client = CreateClient();
        var token = Services.GetRequiredService<TokenService>().CreateToken(AdminUsername);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token.AccessToken);
        return client;
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if (disposing) _connection.Dispose();
    }
}

/// <summary>Same API with a tiny login limit, to test throttling.</summary>
public sealed class RateLimitedApiFactory : JobHunterApiFactory
{
    protected override int LoginPermitLimit => 3;
}
