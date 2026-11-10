namespace AdmissionSystem.Api.Models;

public class ClassEntity
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public int TotalSeats { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    // Navigation property
    public List<HoldEntity> Holds { get; set; } = new();
}
