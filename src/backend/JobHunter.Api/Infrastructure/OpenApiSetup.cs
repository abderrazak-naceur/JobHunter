using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.OpenApi;
using Microsoft.OpenApi;

namespace JobHunter.Api.Infrastructure;

/// <summary>
/// Describes the API for Swagger UI: title, how to sign in, and which operations need the admin token.
/// </summary>
public static class OpenApiSetup
{
    public const string BearerSchemeName = "Bearer";

    public static IServiceCollection AddPortfolioOpenApi(this IServiceCollection services)
    {
        services.AddOpenApi(options =>
        {
            options.AddDocumentTransformer<DocumentInfoTransformer>();
            options.AddOperationTransformer<RequiresTokenTransformer>();
        });
        return services;
    }

    /// <summary>Title, description and the "Bearer token" scheme behind the Authorize button.</summary>
    private sealed class DocumentInfoTransformer : IOpenApiDocumentTransformer
    {
        public Task TransformAsync(OpenApiDocument document, OpenApiDocumentTransformerContext context, CancellationToken cancellationToken)
        {
            document.Info = new OpenApiInfo
            {
                Title = "Portfolio API",
                Version = "v1",
                Description = "Public endpoints serve the portfolio website. Everything else is for the owner: call " +
                              "POST /api/v1/auth/login, copy the accessToken, click Authorize and paste it (without the word Bearer)."
            };

            document.Components ??= new OpenApiComponents();
            document.Components.SecuritySchemes ??= new Dictionary<string, IOpenApiSecurityScheme>();
            document.Components.SecuritySchemes[BearerSchemeName] = new OpenApiSecurityScheme
            {
                Type = SecuritySchemeType.Http,
                Scheme = "bearer",
                BearerFormat = "JWT",
                Description = "The accessToken returned by POST /api/v1/auth/login."
            };

            return Task.CompletedTask;
        }
    }

    /// <summary>Marks the operations that require authorization (and are not explicitly anonymous) with the Bearer scheme.</summary>
    private sealed class RequiresTokenTransformer : IOpenApiOperationTransformer
    {
        public Task TransformAsync(OpenApiOperation operation, OpenApiOperationTransformerContext context, CancellationToken cancellationToken)
        {
            var metadata = context.Description.ActionDescriptor.EndpointMetadata;
            var requiresToken = metadata.OfType<IAuthorizeData>().Any() && !metadata.OfType<IAllowAnonymous>().Any();
            if (!requiresToken) return Task.CompletedTask;

            operation.Security ??= [];
            operation.Security.Add(new OpenApiSecurityRequirement
            {
                [new OpenApiSecuritySchemeReference(BearerSchemeName, context.Document)] = []
            });
            return Task.CompletedTask;
        }
    }
}
