namespace AdmissionSystem.Api.Services;

public interface IHoldExpiryService
{
    Task<int> ExpireStaleHoldsAsync(CancellationToken ct = default);
}
