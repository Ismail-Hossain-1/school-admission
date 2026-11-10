using AdmissionSystem.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace AdmissionSystem.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<ClassEntity> Classes => Set<ClassEntity>();
    public DbSet<HoldEntity> Holds => Set<HoldEntity>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Class configuration
        modelBuilder.Entity<ClassEntity>(entity =>
        {
            entity.ToTable("classes");

            entity.HasKey(c => c.Id);
            entity.Property(c => c.Id)
                .HasColumnName("id")
                .HasMaxLength(64);

            entity.Property(c => c.Name)
                .HasColumnName("name")
                .HasMaxLength(255)
                .IsRequired();

            entity.Property(c => c.TotalSeats)
                .HasColumnName("total_seats")
                .IsRequired();

            entity.Property(c => c.CreatedAt)
                .HasColumnName("created_at")
                .IsRequired();

            entity.ToTable(t => t.HasCheckConstraint("CK_Classes_TotalSeats_Positive", "total_seats > 0"));
        });

        // Hold configuration
        modelBuilder.Entity<HoldEntity>(entity =>
        {
            entity.ToTable("holds");

            entity.HasKey(h => h.Id);
            entity.Property(h => h.Id)
                .HasColumnName("id")
                .HasMaxLength(64);

            entity.Property(h => h.ClassId)
                .HasColumnName("class_id")
                .HasMaxLength(64)
                .IsRequired();

            entity.Property(h => h.StudentId)
                .HasColumnName("student_id")
                .HasMaxLength(17)
                .IsRequired();

            entity.Property(h => h.Status)
                .HasColumnName("status")
                .HasMaxLength(20)
                .IsRequired();

            entity.Property(h => h.ExpiresAt)
                .HasColumnName("expires_at")
                .IsRequired();

            entity.Property(h => h.CreatedAt)
                .HasColumnName("created_at")
                .IsRequired();

            entity.Property(h => h.UpdatedAt)
                .HasColumnName("updated_at")
                .IsRequired();

            // Foreign Key
            entity.HasOne(h => h.Class)
                .WithMany(c => c.Holds)
                .HasForeignKey(h => h.ClassId)
                .OnDelete(DeleteBehavior.Cascade);

            // Indexes for optimal query performance
            entity.HasIndex(h => new { h.ClassId, h.Status })
                .HasDatabaseName("idx_holds_class_status");

            entity.HasIndex(h => h.StudentId)
                .HasDatabaseName("idx_holds_student_id");

            entity.HasIndex(h => new { h.Status, h.ExpiresAt })
                .HasDatabaseName("idx_holds_status_expires_at");

            entity.ToTable(t => t.HasCheckConstraint("CK_Holds_Status_Valid", 
                "status IN ('HELD', 'CONFIRMED', 'EXPIRED', 'CANCELLED')"));
        });
    }
}

