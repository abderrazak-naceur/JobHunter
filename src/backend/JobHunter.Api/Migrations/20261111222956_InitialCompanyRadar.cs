using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JobHunter.Api.Migrations
{
    /// <inheritdoc />
    public partial class InitialCompanyRadar : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Companies",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(180)", maxLength: 180, nullable: false),
                    Website = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    CareersUrl = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    Location = table.Column<string>(type: "character varying(180)", maxLength: 180, nullable: false),
                    Sector = table.Column<string>(type: "character varying(180)", maxLength: 180, nullable: false),
                    Technologies = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    Priority = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Notes = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    Followed = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Companies", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Companies_CareersUrl",
                table: "Companies",
                column: "CareersUrl",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Companies_Followed_Priority",
                table: "Companies",
                columns: new[] { "Followed", "Priority" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Companies");
        }
    }
}
