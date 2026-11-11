var builder = WebApplication.CreateBuilder(args);
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddOpenApi();
var app = builder.Build();
if (app.Environment.IsDevelopment()) app.MapOpenApi();
app.MapGet("/", () => Results.Ok(new { name = "JobHunter API", version = "0.1.0", status = "running" }));
app.MapGet("/health", () => Results.Ok(new { status = "Healthy", timestamp = DateTimeOffset.UtcNow }));
app.MapGet("/api/v1/portfolio", () => Results.Ok(new { headline = "Senior .NET Developer", skills = new[] { "C#", ".NET", "React", "TypeScript", "SQL Server", "Docker" } }));
app.Run();
