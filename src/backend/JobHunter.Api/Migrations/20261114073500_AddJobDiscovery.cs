using System;
using JobHunter.Api.Infrastructure;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JobHunter.Api.Migrations;

[DbContext(typeof(JobHunterDbContext))]
[Migration("20261114073500_AddJobDiscovery")]
public partial class AddJobDiscovery : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "JobSearchProfiles",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uuid", nullable: false),
                Name = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                RoleKeywords = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                SkillKeywords = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                Location = table.Column<string>(type: "character varying(180)", maxLength: 180, nullable: false),
                MinimumAnnualSalary = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: true),
                WorkMode = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                MinimumMatchScore = table.Column<int>(type: "integer", nullable: false),
                IsActive = table.Column<bool>(type: "boolean", nullable: false),
                CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table => table.PrimaryKey("PK_JobSearchProfiles", x => x.Id));

        migrationBuilder.CreateTable(
            name: "JobSearchRuns",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uuid", nullable: false),
                StartedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                CompletedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                FoundCount = table.Column<int>(type: "integer", nullable: false),
                NewCount = table.Column<int>(type: "integer", nullable: false),
                UpdatedCount = table.Column<int>(type: "integer", nullable: false),
                ErrorCount = table.Column<int>(type: "integer", nullable: false),
                Summary = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false)
            },
            constraints: table => table.PrimaryKey("PK_JobSearchRuns", x => x.Id));

        migrationBuilder.CreateTable(
            name: "JobSources",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uuid", nullable: false),
                CompanyName = table.Column<string>(type: "character varying(180)", maxLength: 180, nullable: false),
                Provider = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                BoardIdentifier = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                CareersUrl = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                IsEnabled = table.Column<bool>(type: "boolean", nullable: false),
                LastCheckedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                LastSuccessfulAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                LastError = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table => table.PrimaryKey("PK_JobSources", x => x.Id));

        migrationBuilder.CreateTable(
            name: "JobListings",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uuid", nullable: false),
                JobSourceId = table.Column<Guid>(type: "uuid", nullable: false),
                ExternalId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                Title = table.Column<string>(type: "character varying(180)", maxLength: 180, nullable: false),
                CompanyName = table.Column<string>(type: "character varying(180)", maxLength: 180, nullable: false),
                Location = table.Column<string>(type: "character varying(180)", maxLength: 180, nullable: false),
                WorkMode = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                SalaryText = table.Column<string>(type: "character varying(180)", maxLength: 180, nullable: false),
                Description = table.Column<string>(type: "text", nullable: false),
                SourceUrl = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                ApplyUrl = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                PublishedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                SourceUpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                FirstSeenAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                LastSeenAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_JobListings", x => x.Id);
                table.ForeignKey(
                    name: "FK_JobListings_JobSources_JobSourceId",
                    column: x => x.JobSourceId,
                    principalTable: "JobSources",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateIndex(
            name: "IX_JobSearchProfiles_IsActive",
            table: "JobSearchProfiles",
            column: "IsActive");
        migrationBuilder.CreateIndex(
            name: "IX_JobSearchRuns_StartedAt",
            table: "JobSearchRuns",
            column: "StartedAt");
        migrationBuilder.CreateIndex(
            name: "IX_JobSources_Provider_BoardIdentifier",
            table: "JobSources",
            columns: new[] { "Provider", "BoardIdentifier" },
            unique: true);
        migrationBuilder.CreateIndex(
            name: "IX_JobListings_JobSourceId_ExternalId",
            table: "JobListings",
            columns: new[] { "JobSourceId", "ExternalId" },
            unique: true);
        migrationBuilder.CreateIndex(
            name: "IX_JobListings_PublishedAt",
            table: "JobListings",
            column: "PublishedAt");
        migrationBuilder.CreateIndex(
            name: "IX_JobListings_LastSeenAt",
            table: "JobListings",
            column: "LastSeenAt");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "JobListings");
        migrationBuilder.DropTable(name: "JobSearchProfiles");
        migrationBuilder.DropTable(name: "JobSearchRuns");
        migrationBuilder.DropTable(name: "JobSources");
    }
}
