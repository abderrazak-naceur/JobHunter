using System.Text.RegularExpressions;

namespace JobHunter.Api.Infrastructure;

/// <summary>
/// Request correlation: every response carries an <c>X-Correlation-Id</c> and every log line written while the
/// request runs includes it, so a user-reported problem can be found in the logs.
/// </summary>
public sealed partial class CorrelationIdMiddleware(RequestDelegate next, ILogger<CorrelationIdMiddleware> logger)
{
    public const string HeaderName = "X-Correlation-Id";

    // Only short, plain identifiers are accepted from the caller; anything else is replaced.
    [GeneratedRegex("^[A-Za-z0-9._-]{8,64}$")]
    private static partial Regex ValidId();

    public async Task InvokeAsync(HttpContext context)
    {
        var supplied = context.Request.Headers[HeaderName].ToString();
        var id = ValidId().IsMatch(supplied) ? supplied : Guid.NewGuid().ToString("N");

        context.Response.Headers[HeaderName] = id;
        context.TraceIdentifier = id;

        using (logger.BeginScope(new Dictionary<string, object> { ["CorrelationId"] = id }))
        {
            await next(context);
        }
    }
}

public static class ObservabilityExtensions
{
    public static IApplicationBuilder UseCorrelationId(this IApplicationBuilder app) =>
        app.UseMiddleware<CorrelationIdMiddleware>();

    /// <summary>
    /// <c>/health</c> only says the process is up. <c>/health/ready</c> also checks the database and answers
    /// 503 when it cannot be reached; it never reveals the reason (that goes to the logs).
    /// </summary>
    public static IEndpointRouteBuilder MapHealthEndpoints(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapGet("/health", () => Results.Ok(new { status = "Healthy", timestamp = DateTimeOffset.UtcNow }))
            .AllowAnonymous();

        endpoints.MapGet("/health/ready", async (
            JobHunterDbContext db,
            ILoggerFactory loggerFactory,
            CancellationToken cancellationToken) =>
        {
            try
            {
                using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
                timeout.CancelAfter(TimeSpan.FromSeconds(3));

                if (await db.Database.CanConnectAsync(timeout.Token))
                    return Results.Ok(new { status = "Healthy", database = "Healthy", timestamp = DateTimeOffset.UtcNow });
            }
            catch (Exception exception) when (exception is not OperationCanceledException || !cancellationToken.IsCancellationRequested)
            {
                loggerFactory.CreateLogger("Health").LogError(exception, "Readiness check failed.");
            }

            return Results.Json(
                new { status = "Unhealthy", database = "Unhealthy", timestamp = DateTimeOffset.UtcNow },
                statusCode: StatusCodes.Status503ServiceUnavailable);
        }).AllowAnonymous();

        return endpoints;
    }
}
