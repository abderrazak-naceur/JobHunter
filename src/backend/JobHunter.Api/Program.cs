using System.Threading.RateLimiting;
using JobHunter.Api.Endpoints;
using JobHunter.Api.Infrastructure;
using JobHunter.Api.Infrastructure.Auth;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

// CLI helper to create the admin password hash: dotnet run --project src/backend/JobHunter.Api -- hash-password
if (args.Length > 0 && args[0] == PasswordHashCommand.Name)
    return PasswordHashCommand.Run();

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddOpenApi();

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("Connection string 'DefaultConnection' is not configured.");

builder.Services.AddDbContext<JobHunterDbContext>(options => options.UseNpgsql(connectionString));

// --- Authentication (single admin user, JWT bearer) ---------------------------------------------
// Misconfiguration (missing admin credentials, short signing key) fails the application at startup.
builder.Services.AddOptions<AdminOptions>().BindConfiguration(AdminOptions.SectionName).ValidateDataAnnotations().ValidateOnStart();
builder.Services.AddOptions<JwtOptions>().BindConfiguration(JwtOptions.SectionName).ValidateDataAnnotations().ValidateOnStart();
builder.Services.AddOptions<LoginRateLimitOptions>().BindConfiguration(LoginRateLimitOptions.SectionName).ValidateDataAnnotations().ValidateOnStart();
builder.Services.AddSingleton<TokenService>();

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer();
builder.Services.AddOptions<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme)
    .Configure<IOptions<JwtOptions>>((bearer, jwt) =>
    {
        bearer.MapInboundClaims = false;
        bearer.TokenValidationParameters = TokenService.CreateValidationParameters(jwt.Value);
    });

// Secure by default: every endpoint requires a signed-in admin unless it explicitly calls AllowAnonymous().
builder.Services.AddAuthorizationBuilder()
    .SetFallbackPolicy(new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build());

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy(AuthEndpoints.LoginRateLimitPolicy, httpContext =>
    {
        var limit = httpContext.RequestServices.GetRequiredService<IOptions<LoginRateLimitOptions>>().Value.LoginPermitLimit;
        return RateLimitPartition.GetFixedWindowLimiter(
            httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = limit,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            });
    });
});

// --- CORS: allowed browser origins come from configuration (Cors:AllowedOrigins:0, :1, ...) -----
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
if (allowedOrigins.Length == 0 && builder.Environment.IsDevelopment())
    allowedOrigins = ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:4173"];

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
        policy.WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod());
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi().AllowAnonymous();
}

app.UseCors("Frontend");
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

// Public endpoints
app.MapGet("/", () => Results.Ok(new { name = "Portfolio API", version = "0.3.0", status = "running" })).AllowAnonymous();
app.MapGet("/health", () => Results.Ok(new { status = "Healthy", timestamp = DateTimeOffset.UtcNow })).AllowAnonymous();
app.MapAuthEndpoints();
app.MapPortfolioEndpoints(); // GET is public, PUT requires the admin token

// Everything below requires the admin token.
app.MapCompanyEndpoints();
app.MapApplicationEndpoints();

app.Run();
return 0;

// Exposes the entry point to WebApplicationFactory<Program> in the test project.
public partial class Program;
