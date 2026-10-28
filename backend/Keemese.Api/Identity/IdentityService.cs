using System.Text.RegularExpressions;
using Keemese.Api.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Keemese.Api.Identity;

public sealed class ApiFault(int status, string code) : Exception(code)
{
    public int Status { get; } = status;
    public string Code { get; } = code;
}

public sealed class IdentityService(WorkspaceDb db, IPasswordHasher<Account> hasher, TimeProvider time)
{
    private static readonly Account Dummy = new() { Id = Guid.Empty };
    private static readonly string DummyHash = new PasswordHasher<Account>().HashPassword(Dummy, "dummy password only");
    private static readonly Regex UsernamePattern = new("^[A-Za-z0-9._-]{3,64}$", RegexOptions.CultureInvariant);
    public static string Username(string? value)
    {
        var name = value?.Trim() ?? "";
        if (!UsernamePattern.IsMatch(name)) throw new ApiFault(400, "invalid_username");
        return name;
    }
    public static string DisplayName(string? value)
    {
        var name = value?.Trim() ?? "";
        if (name.Length is < 1 or > 200) throw new ApiFault(400, "invalid_display_name");
        return name;
    }
    public static void Password(string? value)
    {
        if (value is null || value.Length is < 12 or > 128) throw new ApiFault(400, "invalid_password");
    }
    public void Audit(string action, Guid target, Guid? actor = null) => db.Audit.Add(new()
        { Action = action, TargetId = target, ActorId = actor, At = time.GetUtcNow() });
    private void SetPassword(Account account, string password)
    {
        account.PasswordHash = hasher.HashPassword(account, password);
        account.SecurityStamp = Guid.NewGuid().ToString();
        account.ConcurrencyStamp = Guid.NewGuid().ToString();
        account.AccessFailedCount = 0;
        account.LockoutEnd = null;
    }
    public async Task RevokeAsync(Guid userId) => await db.Sessions.Where(x => x.UserId == userId)
        .ExecuteUpdateAsync(s => s.SetProperty(x => x.Revoked, true));

    public async Task<Guid> BootstrapAsync(string username, string password)
    {
        username = Username(username); Password(password);
        await using var tx = await db.Database.BeginTransactionAsync();
        await db.LockIdentityAsync();
        if (await db.Users.AnyAsync(x => x.Role == "Tutor")) throw new ApiFault(409, "tutor_exists");
        var account = new Account { Id = Guid.NewGuid(), Role = "Tutor", UserName = username,
            NormalizedUserName = username.ToUpperInvariant() };
        if (await db.Users.AnyAsync(x => x.NormalizedUserName == account.NormalizedUserName))
            throw new ApiFault(409, "username_exists");
        SetPassword(account, password);
        db.Users.Add(account); Audit("tutor_bootstrap", account.Id);
        await db.SaveChangesAsync(); await tx.CommitAsync(); return account.Id;
    }

    public async Task RecoverAsync(string password, bool confirmed)
    {
        if (!confirmed) throw new ApiFault(400, "recovery_confirmation_required");
        Password(password);
        await using var tx = await db.Database.BeginTransactionAsync();
        await db.LockIdentityAsync();
        var account = await db.Users.SingleOrDefaultAsync(x => x.Role == "Tutor") ?? throw new ApiFault(404, "tutor_missing");
        SetPassword(account, password); await RevokeAsync(account.Id);
        Audit("tutor_recovery", account.Id);
        await db.SaveChangesAsync(); await tx.CommitAsync();
    }

    public async Task<(Account Account, LoginSession Session)?> LoginAsync(string? username, string? password)
    {
        // Bound input before hashing. Nonexistent accounts still do framework password work.
        var normalized = username?.Trim().ToUpperInvariant();
        await using var tx = await db.Database.BeginTransactionAsync();
        await db.LockIdentityAsync();
        var account = normalized is { Length: <= 64 } ? await db.Users.SingleOrDefaultAsync(x => x.NormalizedUserName == normalized) : null;
        var hash = account?.PasswordHash ?? DummyHash;
        var candidate = password is { Length: <= 128 } ? password : "";
        var result = hasher.VerifyHashedPassword(account ?? Dummy, hash, candidate);
        var now = time.GetUtcNow();
        if (account is null || account.PasswordHash is null || !account.Active || account.LockoutEnd > now || result == PasswordVerificationResult.Failed)
        {
            if (account is { Active: true } && !(account.LockoutEnd > now))
            {
                if (account.LockoutEnd is not null) account.AccessFailedCount = 0;
                account.LockoutEnd = null;
                account.AccessFailedCount++;
                if (account.AccessFailedCount >= 5) account.LockoutEnd = now.AddMinutes(15);
                await db.SaveChangesAsync();
            }
            await tx.CommitAsync(); return null;
        }
        account.AccessFailedCount = 0; account.LockoutEnd = null;
        if (result == PasswordVerificationResult.SuccessRehashNeeded) SetPassword(account, candidate);
        var session = new LoginSession { UserId = account.Id, ExpiresAt = now.AddHours(8) };
        db.Sessions.Add(session); await db.SaveChangesAsync(); await tx.CommitAsync();
        return (account, session);
    }

    public async Task ChangePasswordAsync(Guid userId, string? current, string? next)
    {
        Password(next);
        await using var tx = await db.Database.BeginTransactionAsync(); await db.LockIdentityAsync();
        var account = await db.Users.SingleAsync(x => x.Id == userId);
        if (current is null || current.Length > 128 || hasher.VerifyHashedPassword(account, account.PasswordHash!, current) == PasswordVerificationResult.Failed)
            throw new ApiFault(400, "invalid_current_password");
        if (hasher.VerifyHashedPassword(account, account.PasswordHash!, next!) != PasswordVerificationResult.Failed)
            throw new ApiFault(400, "password_unchanged");
        SetPassword(account, next!); account.MustChangePassword = false;
        await RevokeAsync(userId); Audit("password_change", userId, userId);
        await db.SaveChangesAsync(); await tx.CommitAsync();
    }
}
