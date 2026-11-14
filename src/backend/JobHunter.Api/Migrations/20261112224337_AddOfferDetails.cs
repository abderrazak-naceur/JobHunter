using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JobHunter.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddOfferDetails : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "OfferBenefits",
                table: "JobApplications",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<decimal>(
                name: "OfferBonus",
                table: "JobApplications",
                type: "numeric(12,2)",
                precision: 12,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "OfferDecisionBy",
                table: "JobApplications",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "OfferGrossAnnual",
                table: "JobApplications",
                type: "numeric(12,2)",
                precision: 12,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "OfferRemoteDaysPerWeek",
                table: "JobApplications",
                type: "integer",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "OfferBenefits",
                table: "JobApplications");

            migrationBuilder.DropColumn(
                name: "OfferBonus",
                table: "JobApplications");

            migrationBuilder.DropColumn(
                name: "OfferDecisionBy",
                table: "JobApplications");

            migrationBuilder.DropColumn(
                name: "OfferGrossAnnual",
                table: "JobApplications");

            migrationBuilder.DropColumn(
                name: "OfferRemoteDaysPerWeek",
                table: "JobApplications");
        }
    }
}
