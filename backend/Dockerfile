# Stage 1: Build and publish
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Restore dependencies using distinct layer for optimal Docker caching
COPY ["src/AdmissionSystem.Api/AdmissionSystem.Api.csproj", "src/AdmissionSystem.Api/"]
RUN dotnet restore "src/AdmissionSystem.Api/AdmissionSystem.Api.csproj"

# Copy application source and publish Release artifacts
COPY ["src/AdmissionSystem.Api/", "src/AdmissionSystem.Api/"]
RUN dotnet publish "src/AdmissionSystem.Api/AdmissionSystem.Api.csproj" -c Release -o /app/publish --no-restore

# Stage 2: Lightweight production runtime
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app

ENV ASPNETCORE_URLS=http://+:8080 \
    DOTNET_RUNNING_IN_CONTAINER=true \
    HOLD_DURATION_SECONDS=600

EXPOSE 8080

COPY --from=build /app/publish .

USER $APP_UID

ENTRYPOINT ["dotnet", "AdmissionSystem.Api.dll"]

