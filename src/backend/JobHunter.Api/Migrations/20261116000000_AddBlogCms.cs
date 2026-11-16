using JobHunter.Api.Infrastructure;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JobHunter.Api.Migrations;

[DbContext(typeof(JobHunterDbContext))]
[Migration("20261116000000_AddBlogCms")]
public sealed class AddBlogCms : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "BlogPosts",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uuid", nullable: false),
                Title = table.Column<string>(type: "character varying(180)", maxLength: 180, nullable: false),
                Slug = table.Column<string>(type: "character varying(180)", maxLength: 180, nullable: false),
                Excerpt = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                ContentMarkdown = table.Column<string>(type: "text", nullable: false),
                Category = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                TagsJson = table.Column<string>(type: "text", nullable: false),
                CoverImageUrl = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                SeoTitle = table.Column<string>(type: "character varying(180)", maxLength: 180, nullable: true),
                SeoDescription = table.Column<string>(type: "character varying(320)", maxLength: 320, nullable: true),
                Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                PublishedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
            },
            constraints: table => table.PrimaryKey("PK_BlogPosts", x => x.Id));
        migrationBuilder.CreateIndex(name: "IX_BlogPosts_Slug", table: "BlogPosts", column: "Slug", unique: true);
        migrationBuilder.CreateIndex(name: "IX_BlogPosts_Status_PublishedAt", table: "BlogPosts", columns: new[] { "Status", "PublishedAt" });
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "BlogPosts");
    }
}
