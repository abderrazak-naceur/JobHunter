using JobHunter.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace JobHunter.Api.Infrastructure;

public sealed class JobHunterDbContext(DbContextOptions<JobHunterDbContext> options) : DbContext(options)
{
    public DbSet<Company> Companies => Set<Company>();
    public DbSet<PortfolioProfile> PortfolioProfiles => Set<PortfolioProfile>();
    public DbSet<PortfolioAsset> PortfolioAssets => Set<PortfolioAsset>();
    public DbSet<JobApplication> JobApplications => Set<JobApplication>();
    public DbSet<AdminAccount> AdminAccounts => Set<AdminAccount>();
    public DbSet<ApplicationEvent> ApplicationEvents => Set<ApplicationEvent>();
    public DbSet<Contact> Contacts => Set<Contact>();

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

        var portfolio = modelBuilder.Entity<PortfolioProfile>();
        portfolio.ToTable("PortfolioProfiles");
        portfolio.HasKey(x => x.Id);
        portfolio.Property(x => x.Id).ValueGeneratedNever();
        portfolio.Property(x => x.ContentJson).IsRequired();

        var asset = modelBuilder.Entity<PortfolioAsset>();
        asset.ToTable("PortfolioAssets");
        asset.HasKey(x => x.Kind);
        asset.Property(x => x.Kind).HasMaxLength(20);
        asset.Property(x => x.ContentType).HasMaxLength(100).IsRequired();
        asset.Property(x => x.Data).IsRequired();

        var adminAccount = modelBuilder.Entity<AdminAccount>();
        adminAccount.ToTable("AdminAccounts");
        adminAccount.HasKey(x => x.Id);
        adminAccount.Property(x => x.Id).ValueGeneratedNever();
        adminAccount.Property(x => x.Username).HasMaxLength(100).IsRequired();
        adminAccount.Property(x => x.PasswordHash).HasMaxLength(500).IsRequired();

        var application = modelBuilder.Entity<JobApplication>();
        application.ToTable("JobApplications");
        application.HasKey(x => x.Id);
        application.Property(x => x.Company).HasMaxLength(180).IsRequired();
        application.Property(x => x.Role).HasMaxLength(180).IsRequired();
        application.Property(x => x.Status).HasMaxLength(20).IsRequired();
        application.Property(x => x.Source).HasMaxLength(120);
        application.Property(x => x.Url).HasMaxLength(1000);
        application.Property(x => x.Location).HasMaxLength(180);
        application.Property(x => x.SalaryRange).HasMaxLength(120);
        application.Property(x => x.ContactName).HasMaxLength(180);
        application.Property(x => x.ContactEmail).HasMaxLength(254);
        application.Property(x => x.NextStep).HasMaxLength(250);
        application.Property(x => x.Notes).HasMaxLength(4000);
        application.Property(x => x.OfferGrossAnnual).HasPrecision(12, 2);
        application.Property(x => x.OfferBonus).HasPrecision(12, 2);
        application.Property(x => x.OfferBenefits).HasMaxLength(1000); application.HasIndex(x => x.Status);
        application.HasIndex(x => x.UpdatedAt);
        application.HasMany(x => x.Events).WithOne().HasForeignKey(x => x.ApplicationId).OnDelete(DeleteBehavior.Cascade);

        var applicationEvent = modelBuilder.Entity<ApplicationEvent>();
        applicationEvent.ToTable("ApplicationEvents");
        applicationEvent.HasKey(x => x.Id);
        applicationEvent.Property(x => x.FromStatus).HasMaxLength(20);
        applicationEvent.Property(x => x.ToStatus).HasMaxLength(20).IsRequired();
        applicationEvent.HasIndex(x => x.ApplicationId);

        var contact = modelBuilder.Entity<Contact>();
        contact.ToTable("Contacts");
        contact.HasKey(x => x.Id);
        contact.Property(x => x.Name).HasMaxLength(180).IsRequired();
        contact.Property(x => x.Kind).HasMaxLength(20).IsRequired();
        contact.Property(x => x.Company).HasMaxLength(180);
        contact.Property(x => x.Role).HasMaxLength(180);
        contact.Property(x => x.Email).HasMaxLength(254);
        contact.Property(x => x.Phone).HasMaxLength(40);
        contact.Property(x => x.ProfileUrl).HasMaxLength(500);
        contact.Property(x => x.Notes).HasMaxLength(4000);
        contact.HasIndex(x => x.NextFollowUpOn);
        contact.HasIndex(x => x.UpdatedAt);
    }
}
