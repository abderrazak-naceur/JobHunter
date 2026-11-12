using JobHunter.Api.Infrastructure;
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
public sealed class JobHunterApiFactory : WebApplicationFactory<Program>
{
    private readonly SqliteConnection _connection = new("DataSource=:memory:");

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        _connection.Open();

        builder.UseEnvironment("Testing");
        builder.UseSetting("ConnectionStrings:DefaultConnection", "Host=unused;Database=unused");

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

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if (disposing) _connection.Dispose();
    }
}
