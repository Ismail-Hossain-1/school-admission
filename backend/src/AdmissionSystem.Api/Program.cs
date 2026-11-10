using AdmissionSystem.Api.Data;
using AdmissionSystem.Api.Services;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? Environment.GetEnvironmentVariable("DATABASE_URL")
    ?? "Host=localhost;Port=5432;Database=school_admission;Username=postgres;Password=postgres";

builder.Services.AddDbContext<AppDbContext>(options =>
{
    options.UseNpgsql(connectionString);
});

builder.Services.AddScoped<IAdmissionService, AdmissionService>();
builder.Services.AddScoped<IHoldExpiryService, HoldExpiryService>();
builder.Services.AddHostedService<HoldExpiryBackgroundService>();

// Enforce port 8080 as required by the specification
builder.WebHost.UseUrls("http://0.0.0.0:8080");

var app = builder.Build();

// Health check endpoint for container and startup diagnostics
app.MapGet("/health", () => Results.Ok(new { status = "healthy", timestamp = DateTimeOffset.UtcNow }));

// Automatic database migration on startup in Docker / container environments
if (Environment.GetEnvironmentVariable("DOTNET_RUNNING_IN_CONTAINER") == "true" 
    || Environment.GetEnvironmentVariable("APPLY_MIGRATIONS") == "true")
{
    try
    {
        await app.MigrateDatabaseAsync(maxRetries: 10, delaySeconds: 3);
    }
    catch (Exception ex)
    {
        app.Logger.LogWarning(ex, "Database migration on startup failed.");
    }
}

app.Run();

// Partial Program class for WebApplicationFactory in integration tests
public partial class Program { }
