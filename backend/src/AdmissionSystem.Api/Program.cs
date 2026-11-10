using AdmissionSystem.Api.Data;
using AdmissionSystem.Api.Middleware;
using AdmissionSystem.Api.Services;
using Microsoft.AspNetCore.Mvc;
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

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

builder.Services.AddControllers()
    .ConfigureApiBehaviorOptions(options =>
    {
        options.InvalidModelStateResponseFactory = context =>
        {
            var firstError = context.ModelState.Values
                .SelectMany(v => v.Errors)
                .Select(e => !string.IsNullOrWhiteSpace(e.ErrorMessage) ? e.ErrorMessage : "Invalid input format.")
                .FirstOrDefault() ?? "Invalid request payload.";

            return new BadRequestObjectResult(new { error = firstError });
        };
    });

// Default to port 8080 unless overridden via environment variable or CLI args (supports multi-process bonus)
var hasConfiguredPort = !string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("ASPNETCORE_URLS"))
    || !string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("ASPNETCORE_HTTP_PORTS"))
    || args.Any(a => a.StartsWith("--urls", StringComparison.OrdinalIgnoreCase));

if (!hasConfiguredPort)
{
    builder.WebHost.UseUrls("http://0.0.0.0:8080");
}

var app = builder.Build();

// Global error boundary ensuring 4xx on invalid input and clean JSON errors
app.UseMiddleware<GlobalExceptionMiddleware>();

app.UseCors();

// Health check endpoint for container and startup diagnostics
app.MapGet("/health", () => Results.Ok(new { status = "healthy", timestamp = DateTimeOffset.UtcNow }));

app.MapControllers();

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
