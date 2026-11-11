using JobHunter.Api.Endpoints;
using JobHunter.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddOpenApi();

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("Connection string 'DefaultConnection' is not configured.");

builder.Services.AddDbContext<JobHunterDbContext>(options => options.UseNpgsql(connectionString));

builder.Services.AddCors(options =>
{
    options.AddPolicy("LocalFrontend", policy =>
        policy.WithOrigins("http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:4173")
            .AllowAnyHeader()
            .AllowAnyMethod());
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseCors("LocalFrontend");
}

app.MapGet("/", () => Results.Ok(new { name = "JobHunter API", version = "0.2.0", status = "running" }));
app.MapGet("/health", () => Results.Ok(new { status = "Healthy", timestamp = DateTimeOffset.UtcNow }));
app.MapGet("/api/v1/portfolio", () => Results.Ok(new { headline = "Senior .NET Developer", skills = new[] { "C#", ".NET", "React", "TypeScript", "SQL Server", "Docker" } }));
app.MapCompanyEndpoints();

app.Run();
