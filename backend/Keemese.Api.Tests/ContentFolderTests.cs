using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Keemese.Api.Content;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Keemese.Api.Tests;

public sealed class ContentFolderTests
{
    private const string Root = "/api/v1/content/folders";
    private static async Task<Guid> Create(HttpClient tutor, string name, Guid? parent = null)
    {
        using var result = await tutor.Post(Root, new { name, parentId = parent });
        Assert.Equal(HttpStatusCode.Created, result.StatusCode);
        return (await result.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
    }
    [Fact]
    public Task Hierarchy_assignment_filters_archive_and_safe_deletion() => TestApplicationFactory.WithDatabase(async app =>
    {
        using var tutor = app.Client(); await tutor.Login();
        var root = await Create(tutor, "  Tiếng Việt  "); var child = await Create(tutor, "Listening", root);
        var other = await Create(tutor, "Other");
        var rows = await tutor.GetFromJsonAsync<JsonElement>(Root);
        Assert.Equal("Tiếng Việt", rows.EnumerateArray().Single(x => x.GetProperty("id").GetGuid() == root).GetProperty("name").GetString());
        var direct = await tutor.GetFromJsonAsync<JsonElement>($"{Root}/{child}"); Assert.Equal(root, direct.GetProperty("parentId").GetGuid());
        Assert.False(rows[0].TryGetProperty("authorId", out _));
        Assert.Equal(HttpStatusCode.Conflict, (await tutor.Post($"{Root}/{root}/delete", new { version = 1 })).StatusCode);
        using var createText = await tutor.Post("/api/v1/content", new { title = "Assigned", description = "", body = "Plain\nText", folderId = child });
        Assert.Equal(HttpStatusCode.Created, createText.StatusCode); var text = await createText.Content.ReadFromJsonAsync<JsonElement>(); var id = text.GetProperty("id").GetGuid();
        var filtered = await tutor.GetFromJsonAsync<JsonElement>($"/api/v1/content?folderId={child}"); Assert.Single(filtered.GetProperty("items").EnumerateArray());
        foreach (var f in new[] { "unfiled", root.ToString() })
            Assert.Empty((await tutor.GetFromJsonAsync<JsonElement>("/api/v1/content?folderId=" + f)).GetProperty("items").EnumerateArray());
        Assert.Equal(HttpStatusCode.OK, (await tutor.Post($"/api/v1/content/{id}/archive", new { version = 1 })).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await tutor.Post($"{Root}/{child}/delete", new { version = 1 })).StatusCode); // Archived still owns its folder.
        var archived = await tutor.GetFromJsonAsync<JsonElement>($"/api/v1/content?archived=true&folderId={child}"); Assert.Single(archived.GetProperty("items").EnumerateArray());
        Assert.Equal(HttpStatusCode.OK, (await tutor.Post($"/api/v1/content/{id}/restore", new { version = 2 })).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await tutor.Post($"/api/v1/content/{id}", new { title = "Assigned", description = "", body = "Plain\nText", version = 3, folderId = other })).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await tutor.Post($"{Root}/{child}", new { name = "Moved", parentId = (Guid?)null, version = 1 })).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await tutor.Post($"{Root}/{root}/delete", new { version = 1 })).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await tutor.Post($"{Root}/{child}/delete", new { version = 1 })).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await tutor.Post($"{Root}/{child}/delete", new { version = 2 })).StatusCode);
        var final = await tutor.GetFromJsonAsync<JsonElement>($"/api/v1/content/{id}"); Assert.Equal(other, final.GetProperty("folderId").GetGuid()); Assert.Equal("Plain\nText", final.GetProperty("body").GetString());
        await app.InScope(async (db, _) => { Assert.Equal(2, await db.Audit.CountAsync(x => x.Action == "folder_delete")); Assert.Equal(1, await db.TextContents.CountAsync()); return 0; });
    });

    [Fact]
    public Task Names_cycles_unknown_destinations_and_request_shapes_are_guarded() => TestApplicationFactory.WithDatabase(async app =>
    {
        using var tutor = app.Client(); await tutor.Login();
        var a = await Create(tutor, "Café"); var b = await Create(tutor, "Child", a); await Create(tutor, "Café", b);
        Assert.Equal(HttpStatusCode.Conflict, (await tutor.Post(Root, new { name = "CAFE\u0301", parentId = (Guid?)null })).StatusCode);
        foreach (var parent in new[] { a, b })
            Assert.Equal(HttpStatusCode.Conflict, (await tutor.Post($"{Root}/{a}", new { name = "Café", parentId = parent, version = 1 })).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await tutor.Post($"{Root}/{a}", new { name = "Café", parentId = Guid.NewGuid(), version = 1 })).StatusCode);
        foreach (var body in new object[] { new { name = " " , parentId = (Guid?)null }, new { name = new string('x', 101), parentId = (Guid?)null }, new { name = "bad\0", parentId = (Guid?)null }, new { name = "x" }, new { name = "x", parentId = (Guid?)null, authorId = a } })
            Assert.Equal(HttpStatusCode.BadRequest, (await tutor.Post(Root, body)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await tutor.Post("/api/v1/content", new { title = "x", description = "", body = "", folderId = Guid.NewGuid() })).StatusCode);
        await tutor.AssertStatus("/api/v1/content?folderId=bad", HttpStatusCode.BadRequest); await tutor.AssertStatus(Root + "?studentId=x", HttpStatusCode.BadRequest);
        await tutor.AssertStatus($"{Root}/{Guid.NewGuid()}", HttpStatusCode.NotFound);
        await app.InScope(async (db, _) =>
        {
            Assert.Equal(a, (await db.ContentFolders.SingleAsync(x => x.Id == b)).ParentId); Assert.Empty(await db.TextContents.ToListAsync());
            var actor = (await db.ContentFolders.FirstAsync()).AuthorId;
            db.ContentFolders.AddRange(Enumerable.Range(0, 997).Select(i => new ContentFolder { Name = "Cap" + i, NormalizedName = "CAP" + i, AuthorId = actor }));
            await db.SaveChangesAsync(); return 0;
        });
        var cap = await tutor.Post(Root, new { name = "Over limit", parentId = (Guid?)null }); Assert.Equal(HttpStatusCode.Conflict, cap.StatusCode); Assert.Contains("folder_limit", await cap.Content.ReadAsStringAsync());
    });

    [Fact]
    public Task Every_folder_route_denies_wrong_roles_cases_csrf_origin_and_revoked_sessions() => TestApplicationFactory.WithDatabase(async app =>
    {
        using var tutor = app.Client(); await tutor.Login(); var id = await Create(tutor, "Private folder");
        using var anonymous = app.Client(); using var student = await app.Student(tutor, "folder.student"); using var second = await app.Student(tutor, "folder.second"); using var restricted = await app.Student(tutor, "folder.restricted", rotate: false);
        foreach (var (client, status) in new[] { (anonymous, HttpStatusCode.Unauthorized), (student, HttpStatusCode.Forbidden), (second, HttpStatusCode.Forbidden), (restricted, HttpStatusCode.Forbidden) })
        foreach (var root in new[] { Root, Root.ToUpperInvariant() })
        {
            foreach (var target in new[] { root, root + "/" + id, root + "/" + Guid.NewGuid() })
            {
                using var result = await client.GetAsync(target); Assert.Equal(status, result.StatusCode); Assert.DoesNotContain("Private folder", await result.Content.ReadAsStringAsync()); Assert.Equal("no-store", result.Headers.CacheControl!.ToString());
            }
            foreach (var url in new[] { root, root + "/" + id, root + "/" + id + "/delete" })
                Assert.Equal(status, (await client.Post(url, new { name = "tamper", parentId = (Guid?)null, version = 1 }, csrf: false)).StatusCode);
        }
        Assert.Equal(HttpStatusCode.BadRequest, (await tutor.Post(Root, new { name = "csrf", parentId = (Guid?)null }, csrf: false)).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await tutor.Post($"{Root}/{id}/delete", new { version = 1 }, origin: "https://example.invalid")).StatusCode);
        await tutor.Post("/api/v1/auth/logout", new { }); await tutor.AssertStatus(Root, HttpStatusCode.Unauthorized);
    });

    [Fact]
    public Task Inverse_moves_stale_updates_and_assignment_delete_races_remain_consistent() => TestApplicationFactory.WithDatabase(async app =>
    {
        using var tutor = app.Client(); await tutor.Login(); var a = await Create(tutor, "A"); var b = await Create(tutor, "B");
        var moves = await Task.WhenAll(tutor.Post($"{Root}/{a}", new { name = "A", parentId = b, version = 1 }), tutor.Post($"{Root}/{b}", new { name = "B", parentId = a, version = 1 }));
        Assert.Single(moves, x => x.StatusCode == HttpStatusCode.OK); Assert.Single(moves, x => x.StatusCode == HttpStatusCode.Conflict);
        var empty = await Create(tutor, "Race");
        var race = await Task.WhenAll(tutor.Post($"{Root}/{empty}/delete", new { version = 1 }), tutor.Post("/api/v1/content", new { title = "Race text", description = "", body = "", folderId = empty }));
        Assert.True((race[0].StatusCode == HttpStatusCode.NoContent && race[1].StatusCode == HttpStatusCode.NotFound) || (race[0].StatusCode == HttpStatusCode.Conflict && race[1].StatusCode == HttpStatusCode.Created));
        var staleTarget = await Create(tutor, "Versioned");
        var edit = await Task.WhenAll(tutor.Post($"{Root}/{staleTarget}", new { name = "First", parentId = (Guid?)null, version = 1 }), tutor.Post($"{Root}/{staleTarget}", new { name = "Second", parentId = (Guid?)null, version = 1 }));
        Assert.Single(edit, x => x.StatusCode == HttpStatusCode.OK); Assert.Single(edit, x => x.StatusCode == HttpStatusCode.Conflict);
    });

    [Fact]
    public Task Folder_audit_failures_roll_back_and_database_foreign_keys_restrict_deletion() => TestApplicationFactory.WithDatabase(async app =>
    {
        using var tutor = app.Client(); await tutor.Login(); var id = await Create(tutor, "Original"); await Create(tutor, "Child", id);
        await app.InScope(async (db, _) =>
        {
            var folder = await db.ContentFolders.SingleAsync(x => x.Id == id); folder.Name = "Must roll back"; folder.Version++;
            db.Audit.Add(new() { TargetId = id, Action = new string('x', 41), At = app.Clock.GetUtcNow() });
            await Assert.ThrowsAsync<DbUpdateException>(() => db.SaveChangesAsync()); return 0;
        });
        await app.InScope(async (db, _) =>
        {
            var folder = await db.ContentFolders.SingleAsync(x => x.Id == id); Assert.Equal("Original", folder.Name); Assert.Equal(1, folder.Version);
            db.ContentFolders.Remove(folder); await Assert.ThrowsAsync<DbUpdateException>(() => db.SaveChangesAsync()); return 0;
        });
    });
}
