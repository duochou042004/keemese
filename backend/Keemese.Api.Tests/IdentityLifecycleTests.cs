using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Keemese.Api.Identity;
using Keemese.Api.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Xunit;
using static Keemese.Api.Tests.IdentityCases;

namespace Keemese.Api.Tests;

public sealed class IdentityLifecycleTests
{
    [Fact]
    public Task Provisioning_is_authorized_atomic_and_unique_under_concurrency() => TestApplicationFactory.WithDatabase(async app =>
    {
        using var anonymous = app.Client();
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.Post("/api/v1/students", new { username = "anon" }, csrf: false)).StatusCode);
        using var tutor = app.Client(); Assert.Equal(HttpStatusCode.OK, (await tutor.Login()).StatusCode);
        var duplicate = await Task.WhenAll(Enumerable.Range(0, 2).Select(async i =>
        {
            using var separate = app.Client(); await separate.Login();
            return (await separate.Post("/api/v1/students", new { username = i == 0 ? "Same" : "sAME", displayName = " Học sinh ", temporaryPassword = Temporary })).StatusCode;
        }));
        Assert.Single(duplicate, x => x == HttpStatusCode.Created); Assert.Single(duplicate, x => x == HttpStatusCode.Conflict);
        app.Failure.Enabled = true;
        Assert.Equal(HttpStatusCode.ServiceUnavailable, (await tutor.Post("/api/v1/students", new { username = "rollback", displayName = "Rollback", temporaryPassword = Temporary })).StatusCode);
        app.Failure.Enabled = false;
        await app.InScope(async (db, _) =>
        {
            Assert.False(await db.Users.AnyAsync(x => x.NormalizedUserName == "ROLLBACK"));
            Assert.Single(await db.Students.ToListAsync());
            db.Users.Add(new Account { Id = Guid.NewGuid(), UserName = "same", NormalizedUserName = "SAME" });
            await Assert.ThrowsAsync<DbUpdateException>(() => db.SaveChangesAsync()); return 0;
        });
        var races = await Task.WhenAll(Enumerable.Range(0, 2).Select(async i =>
        {
            try { await app.InScope(async (_, service) => await service.BootstrapAsync("other" + i, TutorPassword)); return 0; }
            catch (ApiFault fault) { Assert.Equal(409, fault.Status); return 1; }
        }));
        Assert.Equal(2, races.Sum());
        await app.InScope(async (db, service) =>
        {
            Assert.Single(await db.Users.Where(x => x.Role == "Tutor").ToListAsync());
            // Bypass service guard: actual PostgreSQL single-tutor unique index must reject it.
            db.Users.Add(new Account { Id = Guid.NewGuid(), Role = "Tutor", UserName = "bypass", NormalizedUserName = "BYPASS" });
            await Assert.ThrowsAsync<DbUpdateException>(() => db.SaveChangesAsync()); return 0;
        });
        await tutor.AssertStatus("/api/v1/auth/me", HttpStatusCode.OK);
    });

    [Fact]
    public Task Two_students_see_only_self_and_all_tutor_routes_deny_selectors() => TestApplicationFactory.WithDatabase(async app =>
    {
        using var tutor = app.Client(); await tutor.Login();
        using var a = await app.Student(tutor, "student.a"); using var b = await app.Student(tutor, "student.b");
        var ownA = await a.GetFromJsonAsync<JsonElement>("/api/v1/me/profile");
        var ownB = await b.GetFromJsonAsync<JsonElement>("/api/v1/me/profile");
        Assert.NotEqual(ownA.GetProperty("id"), ownB.GetProperty("id"));
        Assert.Equal("Tên student.a", ownA.GetProperty("displayName").GetString());
        Assert.Equal(new[] { "displayName", "id", "username" }, ownA.EnumerateObject().Select(x => x.Name).Order().ToArray());
        var id = ownB.GetProperty("id").GetGuid();
        foreach (var student in new[] { a, b })
        {
            foreach (var target in new[] { id, Guid.NewGuid() })
            {
                await student.AssertStatus($"/api/v1/students/{target}", HttpStatusCode.Forbidden);
                Assert.Equal(HttpStatusCode.Forbidden, (await student.Post($"/api/v1/students/{target}/credentials/reset", new { temporaryPassword = Reset, version = 1 })).StatusCode);
                Assert.Equal(HttpStatusCode.Forbidden, (await student.Post($"/api/v1/students/{target}/deactivate", new { version = 1 })).StatusCode);
            }
            await student.AssertStatus("/api/v1/students", HttpStatusCode.Forbidden);
            Assert.Equal(HttpStatusCode.Forbidden, (await student.Post("/api/v1/students", new { username = "evil", displayName = "Evil", temporaryPassword = Temporary, role = "Tutor" })).StatusCode);
            foreach (var selector in new[] { "studentId=" + id, "id=" + id, "role=Tutor", "userId=" + id })
                await student.AssertStatus("/api/v1/me/profile?" + selector, HttpStatusCode.BadRequest);
            using var body = new HttpRequestMessage(HttpMethod.Get, "/api/v1/me/profile") { Content = JsonContent.Create(new { studentId = id }) };
            Assert.Equal(HttpStatusCode.BadRequest, (await student.SendAsync(body)).StatusCode);
            Assert.Equal(HttpStatusCode.MethodNotAllowed, (await student.Post("/api/v1/me/profile", new { active = true })).StatusCode);
        }
        foreach (var extra in new[] { "role", "id", "userId", "active", "mustChangePassword", "studentId" })
        {
            var payload = new Dictionary<string, object> { ["username"] = "tampered", ["displayName"] = "Test", ["temporaryPassword"] = Temporary, [extra] = "Tutor" };
            Assert.Equal(HttpStatusCode.BadRequest, (await tutor.Post("/api/v1/students", payload)).StatusCode);
        }
        await tutor.AssertStatus($"/api/v1/students/{Guid.NewGuid()}", HttpStatusCode.NotFound);
        await tutor.AssertStatus("/api/v1/students?pageSize=101", HttpStatusCode.BadRequest);
        var page = await tutor.GetFromJsonAsync<JsonElement>("/api/v1/students?pageSize=1");
        Assert.Single(page.GetProperty("items").EnumerateArray()); Assert.Equal(2, page.GetProperty("nextPage").GetInt32());
        await tutor.AssertStatus("/api/v1/me/profile", HttpStatusCode.Forbidden);
    });

    [Fact]
    public Task Temporary_password_rotation_restricts_data_and_revokes_both_sessions() => TestApplicationFactory.WithDatabase(async app =>
    {
        using var tutor = app.Client(); await tutor.Login();
        using var student = await app.Student(tutor, "temporary", rotate: false);
        using var second = app.Client(); using var login = await second.Login("temporary", Temporary);
        var cookie = await Cookie(login); using var replay = app.Replay(cookie);
        var me = await student.GetFromJsonAsync<JsonElement>("/api/v1/auth/me"); Assert.True(me.GetProperty("mustChangePassword").GetBoolean());
        var denied = await student.GetAsync("/api/v1/me/profile");
        Assert.Equal(HttpStatusCode.Forbidden, denied.StatusCode); Assert.Contains("password_change_required", await denied.Content.ReadAsStringAsync());
        Assert.Equal(HttpStatusCode.BadRequest, (await student.Post("/api/v1/auth/password", new { currentPassword = Temporary, newPassword = Temporary })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await student.Post("/api/v1/auth/password", new { currentPassword = "wrong", newPassword = Changed })).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await student.Post("/api/v1/auth/password", new { currentPassword = Temporary, newPassword = Changed })).StatusCode);
        await student.AssertStatus("/api/v1/auth/me", HttpStatusCode.Unauthorized);
        await second.AssertStatus("/api/v1/auth/me", HttpStatusCode.Unauthorized);
        await replay.AssertStatus("/api/v1/auth/me", HttpStatusCode.Unauthorized);
        Assert.Equal(HttpStatusCode.Unauthorized, (await student.Login("temporary", Temporary)).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await student.Login("temporary", Changed)).StatusCode);
        await student.AssertStatus("/api/v1/me/profile", HttpStatusCode.OK);
    });

    [Fact]
    public Task Reset_and_deactivation_revoke_immediately_with_stale_and_idempotent_proof() => TestApplicationFactory.WithDatabase(async app =>
    {
        using var tutor = app.Client(); await tutor.Login(); using var one = await app.Student(tutor, "resetme");
        var profile = await one.GetFromJsonAsync<JsonElement>("/api/v1/me/profile"); var id = profile.GetProperty("id").GetGuid();
        using var two = app.Client(); using var login = await two.Login("resetme", Changed); using var replay = app.Replay(await Cookie(login));
        Assert.Equal(HttpStatusCode.Conflict, (await tutor.Post($"/api/v1/students/{id}/credentials/reset", new { version = 9, temporaryPassword = Reset })).StatusCode);
        await one.AssertStatus("/api/v1/me/profile", HttpStatusCode.OK);
        var reset = await tutor.Post($"/api/v1/students/{id}/credentials/reset", new { version = 1, temporaryPassword = Reset }); Assert.Equal(HttpStatusCode.OK, reset.StatusCode);
        foreach (var c in new[] { one, two, replay }) await c.AssertStatus("/api/v1/auth/me", HttpStatusCode.Unauthorized);
        Assert.Equal(HttpStatusCode.Unauthorized, (await one.Login("resetme", Changed)).StatusCode);
        await one.Login("resetme", Reset); await two.Login("resetme", Reset);
        await one.AssertStatus("/api/v1/me/profile", HttpStatusCode.Forbidden);
        Assert.Equal(HttpStatusCode.Conflict, (await tutor.Post($"/api/v1/students/{id}/deactivate", new { version = 1 })).StatusCode);
        await one.AssertStatus("/api/v1/auth/me", HttpStatusCode.OK);
        Assert.Equal(HttpStatusCode.OK, (await tutor.Post($"/api/v1/students/{id}/deactivate", new { version = 2 })).StatusCode);
        foreach (var c in new[] { one, two }) await c.AssertStatus("/api/v1/auth/me", HttpStatusCode.Unauthorized);
        var inactive = await one.Login("resetme", Reset); Assert.Equal(HttpStatusCode.Unauthorized, inactive.StatusCode);
        var repeat = await tutor.Post($"/api/v1/students/{id}/deactivate", new { version = 3 }); Assert.Equal(HttpStatusCode.OK, repeat.StatusCode);
        Assert.Equal(3, (await repeat.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("version").GetInt64());
        await app.InScope(async (db, _) =>
        {
            Assert.Equal(1, await db.Students.CountAsync()); Assert.Equal(1, await db.Audit.CountAsync(x => x.Action == "student_deactivate")); return 0;
        });
    });

    [Fact]
    public Task Logout_revokes_only_current_session_and_cookie_expiry_is_absolute() => TestApplicationFactory.WithDatabase(async app =>
    {
        using var one = app.Client(); using var login = await one.Login(); using var replay = app.Replay(await Cookie(login));
        using var two = app.Client(); await two.Login();
        Assert.Equal(HttpStatusCode.NoContent, (await one.Post("/api/v1/auth/logout", new { })).StatusCode);
        await replay.AssertStatus("/api/v1/auth/me", HttpStatusCode.Unauthorized); await two.AssertStatus("/api/v1/auth/me", HttpStatusCode.OK);
        app.Clock.Advance(TimeSpan.FromHours(7));
        using var live = await two.GetAsync("/api/v1/auth/me"); Assert.Equal(HttpStatusCode.OK, live.StatusCode);
        Assert.False(live.Headers.Contains("Set-Cookie"));
        app.Clock.Advance(TimeSpan.FromHours(1)); await two.AssertStatus("/api/v1/auth/me", HttpStatusCode.Unauthorized);
        // Server expiry independently denies a still-protected cookie.
        using var fresh = app.Client(); await fresh.Login();
        await app.InScope(async (db, _) => { await db.Sessions.ExecuteUpdateAsync(s => s.SetProperty(x => x.ExpiresAt, app.Clock.GetUtcNow())); return 0; });
        await fresh.AssertStatus("/api/v1/auth/me", HttpStatusCode.Unauthorized);
    });

    [Fact]
    public Task Controlled_lockout_and_ip_throttle_have_uniform_authentication_errors() => TestApplicationFactory.WithDatabase(async app =>
    {
        using var client = app.Client();
        string? invalid = null;
        for (var n = 0; n < 5; n++)
        {
            using var response = await client.Login(password: "incorrect"); Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
            invalid = (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("code").GetString();
        }
        using var locked = await client.Login(); Assert.Equal(HttpStatusCode.Unauthorized, locked.StatusCode);
        Assert.Equal(invalid, (await locked.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("code").GetString());
        app.Clock.Advance(TimeSpan.FromMinutes(14)); Assert.Equal(HttpStatusCode.Unauthorized, (await client.Login()).StatusCode);
        app.Clock.Advance(TimeSpan.FromMinutes(1)); Assert.Equal(HttpStatusCode.OK, (await client.Login()).StatusCode);
        app.Clock.Advance(TimeSpan.FromMinutes(1));
        for (var n = 0; n < 10; n++) Assert.Equal(HttpStatusCode.Unauthorized, (await client.Login("missing", "incorrect")).StatusCode);
        var throttled = await client.Login("missing", "incorrect"); Assert.Equal(HttpStatusCode.TooManyRequests, throttled.StatusCode);
        Assert.Equal("60", throttled.Headers.GetValues("Retry-After").Single());
        // Crossing a wall-clock minute alone does not reopen a rolling window.
        app.Clock.Advance(TimeSpan.FromSeconds(59)); Assert.Equal(HttpStatusCode.TooManyRequests, (await client.Login()).StatusCode);
        app.Clock.Advance(TimeSpan.FromSeconds(1)); Assert.Equal(HttpStatusCode.OK, (await client.Login()).StatusCode);
    });

    [Fact]
    public Task Recovery_cannot_create_or_overwrite_bootstrap_and_revokes_all_tutor_cookies() => TestApplicationFactory.WithDatabase(async app =>
    {
        using var one = app.Client(); using var login = await one.Login(); using var replay = app.Replay(await Cookie(login));
        using var two = app.Client(); await two.Login();
        await app.InScope(async (_, service) =>
        {
            await Assert.ThrowsAsync<ApiFault>(() => service.BootstrapAsync("other", Reset));
            await Assert.ThrowsAsync<ApiFault>(() => service.RecoverAsync(Reset, false)); return 0;
        });
        await two.AssertStatus("/api/v1/auth/me", HttpStatusCode.OK);
        await app.InScope(async (_, service) => { await service.RecoverAsync(Reset, true); return 0; });
        foreach (var c in new[] { one, two, replay }) await c.AssertStatus("/api/v1/auth/me", HttpStatusCode.Unauthorized);
        Assert.Equal(HttpStatusCode.Unauthorized, (await one.Login()).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await one.Login(password: Reset)).StatusCode);
        await app.InScope(async (db, _) =>
        {
            Assert.Equal(1, await db.Users.CountAsync(x => x.Role == "Tutor"));
            Assert.Equal(1, await db.Audit.CountAsync(x => x.Action == "tutor_recovery")); return 0;
        });
    });

    [Fact]
    public Task Csrf_origin_cookie_policy_and_safe_serialization_are_enforced() => TestApplicationFactory.WithDatabase(async app =>
    {
        using var tutor = app.Client();
        var missing = await tutor.Post("/api/v1/auth/login", new { username = "tutor", password = TutorPassword }, csrf: false);
        Assert.Equal(HttpStatusCode.BadRequest, missing.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await tutor.Post("/api/v1/auth/login", new { username = "tutor", password = TutorPassword }, token: "invalid")).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await tutor.Post("/api/v1/auth/login", new { username = "tutor", password = TutorPassword }, origin: "https://evil.example")).StatusCode);
        using var login = await tutor.Login(); Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        var setCookie = login.Headers.GetValues("Set-Cookie").Single(x => x.StartsWith(HttpIdentity.CookieName + "=", StringComparison.Ordinal));
        Assert.Contains("secure", setCookie); Assert.Contains("httponly", setCookie); Assert.Contains("samesite=lax", setCookie);
        Assert.DoesNotContain("expires=", setCookie); Assert.DoesNotContain("max-age=", setCookie);
        var deniedLogout = await tutor.Post("/api/v1/auth/logout", new { }, csrf: false); Assert.Equal(HttpStatusCode.BadRequest, deniedLogout.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await tutor.Post("/api/v1/auth/logout", new { }, token: "invalid")).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await tutor.Post("/api/v1/auth/logout", new { }, origin: "https://evil.example")).StatusCode);
        await tutor.AssertStatus("/api/v1/auth/me", HttpStatusCode.OK);
        var created = await tutor.Create("sensitive", "Học sinh bí mật");
        var roster = await tutor.GetAsync("/api/v1/students");
        Assert.Equal("no-store", roster.Headers.CacheControl!.ToString());
        var me = await tutor.GetFromJsonAsync<JsonElement>("/api/v1/auth/me");
        Assert.Equal(new[] { "id", "mustChangePassword", "role" }, me.EnumerateObject().Select(x => x.Name).Order().ToArray());
        var error = await tutor.Post("/api/v1/students", new { username = "short", displayName = "Test", temporaryPassword = "SECRET_TOO_SHORT"[..5] });
        var serialized = created.GetRawText() + me.GetRawText() + await roster.Content.ReadAsStringAsync() + await error.Content.ReadAsStringAsync();
        foreach (var secret in new[] { Temporary, TutorPassword, "passwordHash", "securityStamp", "sessionId", "sid", "accessFailedCount", "lockoutEnd" })
            Assert.DoesNotContain(secret, serialized, StringComparison.OrdinalIgnoreCase);
        var logs = string.Join('\n', app.Logs.Lines);
        foreach (var secret in new[] { Temporary, TutorPassword, "SECRE", await Cookie(login) }) Assert.DoesNotContain(secret, logs);
        await app.InScope(async (db, _) =>
        {
            foreach (var hash in await db.Users.Select(x => x.PasswordHash!).ToListAsync())
            {
                Assert.DoesNotContain(hash, logs); Assert.DoesNotContain(hash, serialized);
            }
            foreach (var session in await db.Sessions.Select(x => x.Id).ToListAsync())
                Assert.DoesNotContain(session.ToString(), logs + serialized);
            return 0;
        });
        using var anonymous = app.Client(); var denied = await anonymous.GetAsync("/api/v1/students");
        Assert.DoesNotContain("Học sinh bí mật", await denied.Content.ReadAsStringAsync());
        using var options = new HttpRequestMessage(HttpMethod.Options, "/api/v1/students"); options.Headers.Add("Origin", "https://evil.example");
        Assert.False((await tutor.SendAsync(options)).Headers.Contains("Access-Control-Allow-Origin"));
    });

    [Fact]
    public Task Input_constraints_and_unchanged_temporary_password_are_explicit() => TestApplicationFactory.WithDatabase(async app =>
    {
        using var tutor = app.Client(); await tutor.Login();
        foreach (var name in new[] { "ab", "spaces here", "học.sinh", new string('a', 65) })
            Assert.Equal(HttpStatusCode.BadRequest, (await tutor.Post("/api/v1/students", new { username = name, displayName = "Test", temporaryPassword = Temporary })).StatusCode);
        foreach (var name in new[] { " ", new string('x', 201) })
            Assert.Equal(HttpStatusCode.BadRequest, (await tutor.Post("/api/v1/students", new { username = "valid", displayName = name, temporaryPassword = Temporary })).StatusCode);
        foreach (var password in new[] { new string('x', 11), new string('x', 129) })
            Assert.Equal(HttpStatusCode.BadRequest, (await tutor.Post("/api/v1/students", new { username = "valid", displayName = "Test", temporaryPassword = password })).StatusCode);
        var trimmed = await tutor.Create("  valid  ", "  Tên giữ nguyên dấu  ");
        Assert.Equal("Tên giữ nguyên dấu", trimmed.GetProperty("displayName").GetString()); Assert.Equal("valid", trimmed.GetProperty("username").GetString());
        Assert.Equal(HttpStatusCode.Conflict, (await tutor.Post("/api/v1/students", new { username = "VALID", displayName = "Other", temporaryPassword = Temporary })).StatusCode);
        // Spaces and Unicode are accepted without a composition rule.
        Assert.Equal(HttpStatusCode.Created, (await tutor.Post("/api/v1/students", new { username = "unicode", displayName = "Unicode", temporaryPassword = new string('ế', 12) })).StatusCode);
    });

    [Fact]
    public Task Database_outage_denies_private_access_but_liveness_ignores_database() => TestApplicationFactory.WithDatabase(async app =>
    {
        using var client = app.Client(); await client.Login();
        // Test-owned database only: take away the session table, leaving a protected cookie intact.
        await app.InScope(async (db, _) => { await db.Database.ExecuteSqlRawAsync("DROP TABLE \"Sessions\""); return 0; });
        var denied = await client.GetAsync("/api/v1/auth/me"); Assert.Equal(HttpStatusCode.ServiceUnavailable, denied.StatusCode);
        Assert.Contains("service_unavailable", await denied.Content.ReadAsStringAsync());
        var health = await client.GetAsync("/api/v1/health/live"); Assert.Equal(HttpStatusCode.OK, health.StatusCode);
        Assert.Equal("{\"status\":\"ok\"}", await health.Content.ReadAsStringAsync());
    });
}
