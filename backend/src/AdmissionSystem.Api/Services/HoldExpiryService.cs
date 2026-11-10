using AdmissionSystem.Api.Data;
using AdmissionSystem.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace AdmissionSystem.Api.Services;

public class HoldExpiryService : IHoldExpiryService
{
    private readonly AppDbContext _db;

    public HoldExpiryService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<int> ExpireStaleHoldsAsync(CancellationToken ct = default)
    {
        var now = DateTimeOffset.UtcNow;

        return await _db.Holds
            .Where(h => h.Status == HoldStatus.Held && h.ExpiresAt <= now)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(h => h.Status, HoldStatus.Expired)
                .SetProperty(h => h.UpdatedAt, now), ct);
    }
}
