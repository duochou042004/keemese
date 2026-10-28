using Keemese.Api.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace Keemese.Api.Persistence;

public sealed class Account : IdentityUser<Guid>
{
    public string Role { get; set; } = "Student";
    public bool Active { get; set; } = true;
    public bool MustChangePassword { get; set; }
}

public sealed class StudentProfile
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public string Role { get; set; } = "Student";
    public string DisplayName { get; set; } = "";
    public long Version { get; set; } = 1;
}

public sealed class LoginSession
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public DateTimeOffset ExpiresAt { get; set; }
    public bool Revoked { get; set; }
}

public sealed class AuditEntry
{
    public long Id { get; set; }
    public Guid? ActorId { get; set; }
    public Guid TargetId { get; set; }
    public string Action { get; set; } = "";
    public DateTimeOffset At { get; set; }
}

public sealed class WorkspaceDb(DbContextOptions<WorkspaceDb> options) : IdentityDbContext<Account, IdentityRole<Guid>, Guid>(options)
{
    public DbSet<StudentProfile> Students => Set<StudentProfile>();
    public DbSet<LoginSession> Sessions => Set<LoginSession>();
    public DbSet<AuditEntry> Audit => Set<AuditEntry>();

    protected override void OnModelCreating(ModelBuilder model)
    {
        base.OnModelCreating(model);
        model.Entity<Account>(e =>
        {
            e.Property(x => x.NormalizedUserName).IsRequired();
            e.HasAlternateKey(x => new { x.Id, x.Role });
            e.HasIndex(x => x.Role).IsUnique().HasFilter("\"Role\" = 'Tutor'");
            e.ToTable(t => t.HasCheckConstraint("account_role", "\"Role\" IN ('Tutor', 'Student')"));
        });
        model.Entity<StudentProfile>(e =>
        {
            e.HasIndex(x => x.UserId).IsUnique();
            e.Property(x => x.DisplayName).HasMaxLength(200).IsRequired();
            e.Property(x => x.Version).IsConcurrencyToken();
            e.HasOne<Account>().WithMany().HasForeignKey(x => new { x.UserId, x.Role })
                .HasPrincipalKey(x => new { x.Id, x.Role }).OnDelete(DeleteBehavior.Restrict);
            e.ToTable(t =>
            {
                t.HasCheckConstraint("profile_role", "\"Role\" = 'Student'");
                t.HasCheckConstraint("profile_name", "length(btrim(\"DisplayName\")) BETWEEN 1 AND 200");
            });
        });
        model.Entity<LoginSession>().HasOne<Account>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
        model.Entity<LoginSession>().HasIndex(x => new { x.UserId, x.Revoked });
        model.Entity<AuditEntry>().Property(x => x.Action).HasMaxLength(40);
    }

    // Serialize identity writes across API processes/operator commands, inside their transaction.
    // Small single-tutor pilot: correctness first; revisit contention before deployment.
    public async Task LockIdentityAsync() =>
        await Database.ExecuteSqlRawAsync("SELECT pg_advisory_xact_lock(746351009)");
}
