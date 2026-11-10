using Microsoft.EntityFrameworkCore;

namespace AdmissionSystem.Api.Data;

public static class DatabaseInitializer
{
    public static async Task MigrateDatabaseAsync(this IHost host, int maxRetries = 10, int delaySeconds = 3)
    {
        using var scope = host.Services.CreateScope();
        var services = scope.ServiceProvider;
        var logger = services.GetRequiredService<ILogger<AppDbContext>>();
        var db = services.GetRequiredService<AppDbContext>();

        var attempts = 0;
        while (attempts < maxRetries)
        {
            attempts++;
            try
            {
                logger.LogInformation("Attempting to apply database migrations (Attempt {Attempt}/{MaxRetries})...", attempts, maxRetries);
                await db.Database.MigrateAsync();
                logger.LogInformation("Database migration applied successfully.");
                return;
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Database migration failed on attempt {Attempt}/{MaxRetries}. Waiting {Delay}s before retry...", attempts, maxRetries, delaySeconds);
                if (attempts >= maxRetries)
                {
                    logger.LogError(ex, "Exhausted all migration retry attempts. Rethrowing exception.");
                    throw;
                }
                await Task.Delay(TimeSpan.FromSeconds(delaySeconds));
            }
        }
    }
}

