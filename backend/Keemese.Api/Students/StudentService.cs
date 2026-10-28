using Keemese.Api.Identity;
using Keemese.Api.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Keemese.Api.Students;

public sealed record CreateStudent(string? Username, string? DisplayName, string? TemporaryPassword);
public sealed record ResetStudent(string? TemporaryPassword, long Version);
public sealed record DeactivateStudent(long Version);
public sealed record TutorStudent(Guid Id, string DisplayName, string Username, bool Active, long Version);
public sealed record OwnProfile(Guid Id, string DisplayName, string Username);

public sealed class StudentService(WorkspaceDb db, IdentityService identity, IPasswordHasher<Account> hasher)
{
    public async Task<TutorStudent> CreateAsync(CreateStudent request, Guid actor)
    {
        var username = IdentityService.Username(request.Username);
        var name = IdentityService.DisplayName(request.DisplayName);
        IdentityService.Password(request.TemporaryPassword);
        await using var tx = await db.Database.BeginTransactionAsync(); await db.LockIdentityAsync();
        if (await db.Users.AnyAsync(x => x.NormalizedUserName == username.ToUpperInvariant()))
            throw new ApiFault(409, "username_exists");
        var user = new Account { Id = Guid.NewGuid(), UserName = username,
            NormalizedUserName = username.ToUpperInvariant(), MustChangePassword = true,
            SecurityStamp = Guid.NewGuid().ToString() };
        user.PasswordHash = hasher.HashPassword(user, request.TemporaryPassword!);
        db.Users.Add(user); await db.SaveChangesAsync();
        var profile = new StudentProfile { UserId = user.Id, DisplayName = name };
        db.Students.Add(profile); identity.Audit("student_create", user.Id, actor);
        await db.SaveChangesAsync(); await tx.CommitAsync();
        return new(profile.Id, name, username, true, profile.Version);
    }

    public async Task<List<TutorStudent>> ListAsync(int page, int size) => await (
        from p in db.Students.AsNoTracking() join u in db.Users.AsNoTracking() on p.UserId equals u.Id
        orderby p.Id select new { p, u }).Skip((page - 1) * size).Take(size + 1)
        .Select(x => new TutorStudent(x.p.Id, x.p.DisplayName, x.u.UserName!, x.u.Active, x.p.Version)).ToListAsync();

    public async Task<TutorStudent?> GetAsync(Guid id) => await (
        from p in db.Students.AsNoTracking() join u in db.Users.AsNoTracking() on p.UserId equals u.Id
        where p.Id == id select new TutorStudent(p.Id, p.DisplayName, u.UserName!, u.Active, p.Version)).SingleOrDefaultAsync();

    public async Task<TutorStudent> UpdateAsync(Guid id, long version, string? password, bool deactivate, Guid actor)
    {
        if (!deactivate) IdentityService.Password(password);
        await using var tx = await db.Database.BeginTransactionAsync(); await db.LockIdentityAsync();
        var profile = await db.Students.SingleOrDefaultAsync(x => x.Id == id) ?? throw new ApiFault(404, "student_missing");
        if (profile.Version != version) throw new ApiFault(409, "stale_version");
        var user = await db.Users.SingleAsync(x => x.Id == profile.UserId);
        if (deactivate && !user.Active)
        {
            await tx.CommitAsync();
            return new(profile.Id, profile.DisplayName, user.UserName!, user.Active, profile.Version);
        }
        if (deactivate) user.Active = false;
        else
        {
            if (!user.Active) throw new ApiFault(409, "student_inactive");
            user.PasswordHash = hasher.HashPassword(user, password!);
            user.SecurityStamp = Guid.NewGuid().ToString();
            user.AccessFailedCount = 0; user.LockoutEnd = null;
            user.MustChangePassword = true;
        }
        profile.Version++; await identity.RevokeAsync(user.Id);
        identity.Audit(deactivate ? "student_deactivate" : "student_reset", user.Id, actor);
        await db.SaveChangesAsync(); await tx.CommitAsync();
        return new(profile.Id, profile.DisplayName, user.UserName!, user.Active, profile.Version);
    }
}
