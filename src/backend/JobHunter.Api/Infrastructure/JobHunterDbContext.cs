using JobHunter.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace JobHunter.Api.Infrastructure;

public sealed class JobHunterDbContext(DbContextOptions<JobHunterDbContext> options) : DbContext(options)
{
    public DbSet<Company> Companies => Set<Company>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        var company = modelBuilder.Entity<Company>();
        company.ToTable("Companies");
        company.HasKey(x => x.Id);
        company.Property(x => x.Name).HasMaxLength(180).IsRequired();
        company.Property(x => x.Website).HasMaxLength(500);
        company.Property(x => x.CareersUrl).HasMaxLength(1000).IsRequired();
        company.Property(x => x.Location).HasMaxLength(180);
        company.Property(x => x.Sector).HasMaxLength(180);
        company.Property(x => x.Technologies).HasMaxLength(1000);
        company.Property(x => x.Priority).HasMaxLength(20).IsRequired();
        company.Property(x => x.Notes).HasMaxLength(4000);
        company.HasIndex(x => x.CareersUrl).IsUnique();
        company.HasIndex(x => new { x.Followed, x.Priority });
    }
}
