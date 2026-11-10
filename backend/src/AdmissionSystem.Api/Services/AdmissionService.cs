using System.Data;
using AdmissionSystem.Api.Data;
using AdmissionSystem.Api.DTOs;
using AdmissionSystem.Api.Exceptions;
using AdmissionSystem.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace AdmissionSystem.Api.Services;

public class AdmissionService : IAdmissionService
{
    private readonly AppDbContext _db;
    private readonly int _holdDurationSeconds;
    private readonly ILogger<AdmissionService> _logger;

    public AdmissionService(
        AppDbContext db,
        IConfiguration configuration,
        ILogger<AdmissionService> logger)
    {
        _db = db;
        _logger = logger;

        var configuredDuration = configuration.GetValue<int?>("HOLD_DURATION_SECONDS");
        _holdDurationSeconds = configuredDuration is > 0 ? configuredDuration.Value : 600;
    }

    public async Task<ClassResponse> CreateClassAsync(CreateClassRequest request, CancellationToken ct = default)
    {
        var trimmedName = request.Name?.Trim();
        if (string.IsNullOrWhiteSpace(trimmedName))
        {
            throw new InvalidHoldOperationException("Class name cannot be empty.");
        }

        if (request.TotalSeats <= 0)
        {
            throw new InvalidHoldOperationException("Total seats must be greater than zero.");
        }

        var classEntity = new ClassEntity
        {
            Id = GenerateId("c"),
            Name = trimmedName,
            TotalSeats = request.TotalSeats,
            CreatedAt = DateTimeOffset.UtcNow
        };

        _db.Classes.Add(classEntity);
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("Created class {ClassId} ({ClassName}) with {TotalSeats} seats.",
            classEntity.Id, classEntity.Name, classEntity.TotalSeats);

        return new ClassResponse(classEntity.Id, classEntity.Name, classEntity.TotalSeats);
    }

    public async Task<IReadOnlyList<ClassDetailResponse>> GetAllClassesAsync(CancellationToken ct = default)
    {
        var now = DateTimeOffset.UtcNow;

        var classes = await _db.Classes
            .AsNoTracking()
            .OrderBy(c => c.CreatedAt)
            .Select(c => new
            {
                c.Id,
                c.Name,
                c.TotalSeats,
                HeldSeats = c.Holds.Count(h => h.Status == HoldStatus.Held && h.ExpiresAt > now),
                ConfirmedSeats = c.Holds.Count(h => h.Status == HoldStatus.Confirmed)
            })
            .ToListAsync(ct);

        return classes.Select(c => new ClassDetailResponse(
            Id: c.Id,
            Name: c.Name,
            TotalSeats: c.TotalSeats,
            HeldSeats: c.HeldSeats,
            ConfirmedSeats: c.ConfirmedSeats,
            AvailableSeats: Math.Max(0, c.TotalSeats - (c.HeldSeats + c.ConfirmedSeats))
        )).ToList();
    }

    public async Task<ClassDetailResponse> GetClassByIdAsync(string classId, CancellationToken ct = default)
    {
        var now = DateTimeOffset.UtcNow;

        var classData = await _db.Classes
            .AsNoTracking()
            .Where(c => c.Id == classId)
            .Select(c => new
            {
                c.Id,
                c.Name,
                c.TotalSeats,
                HeldSeats = c.Holds.Count(h => h.Status == HoldStatus.Held && h.ExpiresAt > now),
                ConfirmedSeats = c.Holds.Count(h => h.Status == HoldStatus.Confirmed)
            })
            .FirstOrDefaultAsync(ct);

        if (classData is null)
        {
            throw new ResourceNotFoundException($"Class '{classId}' was not found.");
        }

        return new ClassDetailResponse(
            Id: classData.Id,
            Name: classData.Name,
            TotalSeats: classData.TotalSeats,
            HeldSeats: classData.HeldSeats,
            ConfirmedSeats: classData.ConfirmedSeats,
            AvailableSeats: Math.Max(0, classData.TotalSeats - (classData.HeldSeats + classData.ConfirmedSeats))
        );
    }

    public async Task<CreateHoldResponse> CreateHoldAsync(string classId, string studentId, CancellationToken ct = default)
    {
        ValidateStudentId(studentId);
        if (string.IsNullOrWhiteSpace(classId))
        {
            throw new InvalidHoldOperationException("Class ID cannot be empty.");
        }

        // Use ReadCommitted with PostgreSQL FOR UPDATE row lock.
        // Each subsequent SELECT inside this transaction acquires a fresh snapshot AFTER acquiring the row lock,
        // guaranteeing visibility of previously committed concurrent seat allocations across all backend processes.
        await using var transaction = await _db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);

        // 1. Lock the target class row in PostgreSQL (ToListAsync prevents EF Core subquery wrapping of FOR UPDATE)
        var classList = await _db.Classes
            .FromSqlInterpolated($"SELECT * FROM classes WHERE id = {classId} FOR UPDATE")
            .ToListAsync(ct);
        var classEntity = classList.FirstOrDefault();

        if (classEntity is null)
        {
            throw new ResourceNotFoundException($"Class '{classId}' was not found.");
        }

        var now = DateTimeOffset.UtcNow;

        // 2. Enforce Rule 3: One active hold or confirmed admission per student per class
        var hasExistingApplication = await _db.Holds
            .AnyAsync(h => h.ClassId == classId
                        && h.StudentId == studentId
                        && (h.Status == HoldStatus.Confirmed || (h.Status == HoldStatus.Held && h.ExpiresAt > now)), ct);

        if (hasExistingApplication)
        {
            throw new ActiveApplicationExistsException(
                $"Student '{studentId}' already has an active hold or confirmed admission for '{classEntity.Name}'.");
        }

        // 3. Enforce Rule 1: Atomic capacity invariant (held + confirmed < totalSeats)
        var occupiedSeats = await _db.Holds
            .CountAsync(h => h.ClassId == classId
                          && (h.Status == HoldStatus.Confirmed || (h.Status == HoldStatus.Held && h.ExpiresAt > now)), ct);

        if (occupiedSeats >= classEntity.TotalSeats)
        {
            throw new SeatUnavailableException($"No available seats remaining in '{classEntity.Name}'.");
        }

        // 4. Allocate seat hold
        var expiresAt = now.AddSeconds(_holdDurationSeconds);
        var hold = new HoldEntity
        {
            Id = GenerateId("h"),
            ClassId = classId,
            StudentId = studentId,
            Status = HoldStatus.Held,
            ExpiresAt = expiresAt,
            CreatedAt = now,
            UpdatedAt = now
        };

        _db.Holds.Add(hold);
        await _db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);

        _logger.LogInformation("Created hold {HoldId} for student {StudentId} in class {ClassId} (expires at {ExpiresAt}).",
            hold.Id, studentId, classId, expiresAt);

        return new CreateHoldResponse(
            HoldId: hold.Id,
            ClassId: hold.ClassId,
            StudentId: hold.StudentId,
            Status: hold.Status,
            ExpiresAt: hold.ExpiresAt
        );
    }

    public async Task<HoldDetailResponse> GetHoldByIdAsync(string holdId, CancellationToken ct = default)
    {
        var hold = await _db.Holds
            .AsNoTracking()
            .FirstOrDefaultAsync(h => h.Id == holdId, ct);

        if (hold is null)
        {
            throw new ResourceNotFoundException($"Hold '{holdId}' was not found.");
        }

        var effectiveStatus = ResolveEffectiveStatus(hold, DateTimeOffset.UtcNow);

        return new HoldDetailResponse(
            HoldId: hold.Id,
            ClassId: hold.ClassId,
            Status: effectiveStatus,
            ExpiresAt: hold.ExpiresAt
        );
    }

    public async Task<ConfirmHoldResponse> ConfirmHoldAsync(string holdId, string studentId, CancellationToken ct = default)
    {
        ValidateStudentId(studentId);
        if (string.IsNullOrWhiteSpace(holdId))
        {
            throw new InvalidHoldOperationException("Hold ID cannot be empty.");
        }

        await using var transaction = await _db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);

        // Lock the specific hold row to prevent concurrent confirm/cancel/expire races
        var holdList = await _db.Holds
            .FromSqlInterpolated($"SELECT * FROM holds WHERE id = {holdId} FOR UPDATE")
            .ToListAsync(ct);
        var hold = holdList.FirstOrDefault();

        if (hold is null)
        {
            throw new ResourceNotFoundException($"Hold '{holdId}' was not found.");
        }

        // Enforce Rule 4: Only the owning student can confirm
        if (!string.Equals(hold.StudentId, studentId, StringComparison.Ordinal))
        {
            throw new UnauthorizedHoldAccessException("You can only confirm your own application.");
        }

        // Enforce Rule 5: Idempotent confirmation
        if (hold.Status == HoldStatus.Confirmed)
        {
            await transaction.CommitAsync(ct);
            return new ConfirmHoldResponse(hold.Id, HoldStatus.Confirmed);
        }

        if (hold.Status == HoldStatus.Cancelled)
        {
            throw new InvalidHoldOperationException("Cannot confirm an application that has been cancelled.");
        }

        var now = DateTimeOffset.UtcNow;

        // Enforce Rule 4: Must not be expired
        if (hold.Status == HoldStatus.Expired || hold.ExpiresAt <= now)
        {
            throw new HoldExpiredException("This hold has expired and can no longer be confirmed.");
        }

        hold.Status = HoldStatus.Confirmed;
        hold.UpdatedAt = now;

        await _db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);

        _logger.LogInformation("Confirmed hold {HoldId} for student {StudentId}.", hold.Id, studentId);

        return new ConfirmHoldResponse(hold.Id, HoldStatus.Confirmed);
    }

    public async Task CancelHoldAsync(string holdId, string studentId, CancellationToken ct = default)
    {
        ValidateStudentId(studentId);
        if (string.IsNullOrWhiteSpace(holdId))
        {
            throw new InvalidHoldOperationException("Hold ID cannot be empty.");
        }

        await using var transaction = await _db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);

        var holdList = await _db.Holds
            .FromSqlInterpolated($"SELECT * FROM holds WHERE id = {holdId} FOR UPDATE")
            .ToListAsync(ct);
        var hold = holdList.FirstOrDefault();

        if (hold is null)
        {
            throw new ResourceNotFoundException($"Hold '{holdId}' was not found.");
        }

        if (!string.Equals(hold.StudentId, studentId, StringComparison.Ordinal))
        {
            throw new UnauthorizedHoldAccessException("You can only cancel your own application.");
        }

        if (hold.Status == HoldStatus.Cancelled)
        {
            // Idempotent cancellation
            await transaction.CommitAsync(ct);
            return;
        }

        if (hold.Status == HoldStatus.Confirmed)
        {
            throw new InvalidHoldOperationException("Cannot cancel an already confirmed admission.");
        }

        var now = DateTimeOffset.UtcNow;
        if (hold.Status == HoldStatus.Expired || hold.ExpiresAt <= now)
        {
            throw new HoldExpiredException("Cannot cancel a hold that has already expired.");
        }

        hold.Status = HoldStatus.Cancelled;
        hold.UpdatedAt = now;

        await _db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);

        _logger.LogInformation("Cancelled hold {HoldId} for student {StudentId}.", hold.Id, studentId);
    }

    public async Task<IReadOnlyList<StudentHoldResponse>> GetStudentHoldsAsync(string studentId, CancellationToken ct = default)
    {
        ValidateStudentId(studentId);

        var now = DateTimeOffset.UtcNow;

        var holds = await _db.Holds
            .AsNoTracking()
            .Include(h => h.Class)
            .Where(h => h.StudentId == studentId)
            .OrderByDescending(h => h.CreatedAt)
            .ToListAsync(ct);

        return holds.Select(h => new StudentHoldResponse(
            HoldId: h.Id,
            ClassId: h.ClassId,
            ClassName: h.Class?.Name ?? string.Empty,
            Status: ResolveEffectiveStatus(h, now),
            ExpiresAt: h.ExpiresAt
        )).ToList();
    }

    private static void ValidateStudentId(string studentId)
    {
        if (string.IsNullOrWhiteSpace(studentId) || studentId.Length != 17 || !studentId.All(char.IsAsciiDigit))
        {
            throw new InvalidHoldOperationException("Invalid X-Student-Id. Must be an exact 17-digit birth registration number.");
        }
    }

    private static string ResolveEffectiveStatus(HoldEntity hold, DateTimeOffset now)
    {
        if (hold.Status == HoldStatus.Held && hold.ExpiresAt <= now)
        {
            return HoldStatus.Expired;
        }

        return hold.Status;
    }

    private static string GenerateId(string prefix)
    {
        return $"{prefix}_{Guid.NewGuid():N}"[..14];
    }
}
