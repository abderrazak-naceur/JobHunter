using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JobHunter.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddJobApplications : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "JobApplications",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Company = table.Column<string>(type: "character varying(180)", maxLength: 180, nullable: false),
                    Role = table.Column<string>(type: "character varying(180)", maxLength: 180, nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Source = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    Url = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    Location = table.Column<string>(type: "character varying(180)", maxLength: 180, nullable: false),
                    SalaryRange = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    ContactName = table.Column<string>(type: "character varying(180)", maxLength: 180, nullable: false),
                    ContactEmail = table.Column<string>(type: "character varying(254)", maxLength: 254, nullable: false),
                    AppliedOn = table.Column<DateOnly>(type: "date", nullable: true),
                    NextStep = table.Column<string>(type: "character varying(250)", maxLength: 250, nullable: false),
                    NextStepOn = table.Column<DateOnly>(type: "date", nullable: true),
                    Notes = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_JobApplications", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ApplicationEvents",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ApplicationId = table.Column<Guid>(type: "uuid", nullable: false),
                    At = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    FromStatus = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    ToStatus = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ApplicationEvents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ApplicationEvents_JobApplications_ApplicationId",
                        column: x => x.ApplicationId,
                        principalTable: "JobApplications",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ApplicationEvents_ApplicationId",
                table: "ApplicationEvents",
                column: "ApplicationId");

            migrationBuilder.CreateIndex(
                name: "IX_JobApplications_Status",
                table: "JobApplications",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_JobApplications_UpdatedAt",
                table: "JobApplications",
                column: "UpdatedAt");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ApplicationEvents");

            migrationBuilder.DropTable(
                name: "JobApplications");
        }
    }
}
