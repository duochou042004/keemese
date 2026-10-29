using Keemese.Api.Content;
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
    public DbSet<ContentFolder> ContentFolders => Set<ContentFolder>();
    public DbSet<TextContent> TextContents => Set<TextContent>();
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
        model.Entity<ContentFolder>(e =>
        {
            e.Property(x => x.Name).HasMaxLength(100).IsRequired();
            e.Property(x => x.NormalizedName).IsRequired();
            e.Property(x => x.Version).IsConcurrencyToken();
            e.HasIndex(x => x.NormalizedName).IsUnique().HasFilter("\"ParentId\" IS NULL");
            e.HasIndex(x => new { x.ParentId, x.NormalizedName }).IsUnique().HasFilter("\"ParentId\" IS NOT NULL");
            e.HasOne<ContentFolder>().WithMany().HasForeignKey(x => x.ParentId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<Account>().WithMany().HasForeignKey(x => new { x.AuthorId, x.AuthorRole })
                .HasPrincipalKey(x => new { x.Id, x.Role }).OnDelete(DeleteBehavior.Restrict);
            e.ToTable(t =>
            {
                t.HasCheckConstraint("folder_author_role", "\"AuthorRole\" = 'Tutor'");
                t.HasCheckConstraint("folder_name", "length(btrim(\"Name\")) BETWEEN 1 AND 100");
                t.HasCheckConstraint("folder_version", "\"Version\" > 0");
                t.HasCheckConstraint("folder_not_self", "\"ParentId\" IS NULL OR \"ParentId\" <> \"Id\"");
            });
        });
        model.Entity<TextContent>(e =>
        {
            e.Property(x => x.Title).HasMaxLength(200).IsRequired();
            e.Property(x => x.Description).HasMaxLength(2000).IsRequired();
            e.Property(x => x.Body).HasMaxLength(50000).IsRequired();
            e.Property(x => x.Version).IsConcurrencyToken();
            e.HasIndex(x => new { x.Archived, x.UpdatedAt, x.Id });
            e.HasIndex(x => new { x.FolderId, x.Archived, x.UpdatedAt, x.Id });
            e.HasOne<ContentFolder>().WithMany().HasForeignKey(x => x.FolderId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<Account>().WithMany().HasForeignKey(x => new { x.AuthorId, x.AuthorRole })
                .HasPrincipalKey(x => new { x.Id, x.Role }).OnDelete(DeleteBehavior.Restrict);
            e.ToTable(t =>
            {
                t.HasCheckConstraint("content_author_role", "\"AuthorRole\" = 'Tutor'");
                t.HasCheckConstraint("content_title", "length(btrim(\"Title\")) BETWEEN 1 AND 200");
                t.HasCheckConstraint("content_version", "\"Version\" > 0");
            });
        });
        model.Entity<LoginSession>().HasOne<Account>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
        model.Entity<LoginSession>().HasIndex(x => new { x.UserId, x.Revoked });
        model.Entity<AuditEntry>().Property(x => x.Action).HasMaxLength(40);
    }

    // Serialize folder hierarchy and assignments together inside their transactions.
    public async Task LockContentAsync() =>
        await Database.ExecuteSqlRawAsync("SELECT pg_advisory_xact_lock(746351010)");

    // Serialize identity writes across API processes/operator commands in their transaction.
    public async Task LockIdentityAsync() =>
        await Database.ExecuteSqlRawAsync("SELECT pg_advisory_xact_lock(746351009)");
}
