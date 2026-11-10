namespace AdmissionSystem.Api.Services;

public class HoldExpiryBackgroundService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<HoldExpiryBackgroundService> _logger;
    private readonly TimeSpan _pollInterval;

    public HoldExpiryBackgroundService(
        IServiceScopeFactory scopeFactory,
        IConfiguration configuration,
        ILogger<HoldExpiryBackgroundService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;

        var configuredSeconds = configuration.GetValue<int?>("HOLD_EXPIRY_CHECK_INTERVAL_SECONDS");
        var intervalSeconds = configuredSeconds is > 0 ? configuredSeconds.Value : 5;
        _pollInterval = TimeSpan.FromSeconds(intervalSeconds);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation(
            "HoldExpiryBackgroundService started. Polling interval: {IntervalSeconds}s.",
            _pollInterval.TotalSeconds);

        using var timer = new PeriodicTimer(_pollInterval);

        try
        {
            while (await timer.WaitForNextTickAsync(stoppingToken))
            {
                await SweepStaleHoldsSafeAsync(stoppingToken);
            }
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            _logger.LogInformation("HoldExpiryBackgroundService is stopping gracefully.");
        }
    }

    private async Task SweepStaleHoldsSafeAsync(CancellationToken ct)
    {
        try
        {
            await using var scope = _scopeFactory.CreateAsyncScope();
            var expiryService = scope.ServiceProvider.GetRequiredService<IHoldExpiryService>();

            var expiredCount = await expiryService.ExpireStaleHoldsAsync(ct);
            if (expiredCount > 0)
            {
                _logger.LogInformation("Swept and expired {ExpiredCount} stale hold(s).", expiredCount);
            }
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            // Graceful shutdown
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error while sweeping expired holds. Will retry on next tick.");
        }
    }
}
