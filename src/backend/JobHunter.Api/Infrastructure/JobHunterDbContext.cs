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
    public DbSet<JobSearchProfile> SearchProfiles => Set<JobSearchProfile>();
    public DbSet<JobSource> JobSources => Set<JobSource>();
    public DbSet<JobListing> JobListings => Set<JobListing>();
    public DbSet<JobSearchRun> JobSearchRuns => Set<JobSearchRun>();

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

        var searchProfile = modelBuilder.Entity<JobSearchProfile>();
        searchProfile.ToTable("JobSearchProfiles");
        searchProfile.HasKey(x => x.Id);
        searchProfile.Property(x => x.Name).HasMaxLength(120).IsRequired();
        searchProfile.Property(x => x.RoleKeywords).HasMaxLength(1000).IsRequired();
        searchProfile.Property(x => x.SkillKeywords).HasMaxLength(1000).IsRequired();
        searchProfile.Property(x => x.Location).HasMaxLength(180).IsRequired();
        searchProfile.Property(x => x.MinimumAnnualSalary).HasPrecision(12, 2);
        searchProfile.Property(x => x.WorkMode).HasMaxLength(20).IsRequired();
        searchProfile.HasIndex(x => x.IsActive);

        var jobSource = modelBuilder.Entity<JobSource>();
        jobSource.ToTable("JobSources");
        jobSource.HasKey(x => x.Id);
        jobSource.Property(x => x.CompanyName).HasMaxLength(180).IsRequired();
        jobSource.Property(x => x.Provider).HasMaxLength(20).IsRequired();
        jobSource.Property(x => x.BoardIdentifier).HasMaxLength(120).IsRequired();
        jobSource.Property(x => x.CareersUrl).HasMaxLength(1000).IsRequired();
        jobSource.Property(x => x.LastError).HasMaxLength(1000).IsRequired();
        jobSource.HasIndex(x => new { x.Provider, x.BoardIdentifier }).IsUnique();

        var jobListing = modelBuilder.Entity<JobListing>();
        jobListing.ToTable("JobListings");
        jobListing.HasKey(x => x.Id);
        jobListing.Property(x => x.ExternalId).HasMaxLength(100).IsRequired();
        jobListing.Property(x => x.Title).HasMaxLength(180).IsRequired();
        jobListing.Property(x => x.CompanyName).HasMaxLength(180).IsRequired();
        jobListing.Property(x => x.Location).HasMaxLength(180).IsRequired();
        jobListing.Property(x => x.WorkMode).HasMaxLength(30).IsRequired();
        jobListing.Property(x => x.SalaryText).HasMaxLength(180).IsRequired();
        jobListing.Property(x => x.Description).IsRequired();
        jobListing.Property(x => x.SourceUrl).HasMaxLength(1000).IsRequired();
        jobListing.Property(x => x.ApplyUrl).HasMaxLength(1000).IsRequired();
        jobListing.HasIndex(x => new { x.JobSourceId, x.ExternalId }).IsUnique();
        jobListing.HasIndex(x => x.PublishedAt);
        jobListing.HasIndex(x => x.LastSeenAt);
        jobListing.HasOne<JobSource>().WithMany().HasForeignKey(x => x.JobSourceId).OnDelete(DeleteBehavior.Cascade);

        var searchRun = modelBuilder.Entity<JobSearchRun>();
        searchRun.ToTable("JobSearchRuns");
        searchRun.HasKey(x => x.Id);
        searchRun.Property(x => x.Status).HasMaxLength(20).IsRequired();
        searchRun.Property(x => x.Summary).HasMaxLength(4000).IsRequired();
        searchRun.HasIndex(x => x.StartedAt);

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
