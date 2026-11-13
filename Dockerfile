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
COPY --from=build /app/publish .

# Render's default web-service port. Bind on all interfaces inside the container.
ENV ASPNETCORE_URLS=http://0.0.0.0:10000
EXPOSE 10000
ENTRYPOINT ["dotnet", "JobHunter.Api.dll"]
