# Build the ASP.NET Core 10 API from the repository root so the shared portfolio content is embedded.
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY src/backend/JobHunter.Api/JobHunter.Api.csproj src/backend/JobHunter.Api/
RUN dotnet restore src/backend/JobHunter.Api/JobHunter.Api.csproj

COPY . .
RUN dotnet publish src/backend/JobHunter.Api/JobHunter.Api.csproj \
    --configuration Release \
    --output /app/publish \
    --no-restore \
    /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

# Npgsql's native GSS support requires the Kerberos GSSAPI runtime library on Debian.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libgssapi-krb5-2 \
    && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/publish .

# Render's default web-service port. Bind on all interfaces inside the container.
ENV ASPNETCORE_URLS=http://0.0.0.0:10000
EXPOSE 10000
ENTRYPOINT ["dotnet", "JobHunter.Api.dll"]
