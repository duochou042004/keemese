using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Keemese.Api.Content;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Keemese.Api.Tests;

public sealed class ContentLibraryTests
{
    private const string Root = "/api/v1/content";
    private static async Task<JsonElement> Create(HttpClient tutor, string title = "Bài học – Tiếng Việt")
    {
        using var response = await tutor.Post(Root, new { title, description = "  Mô tả\nwith whitespace  ", body = "<script>alert('plain text')</script>\nNội dung \U0001F600\n " });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.StartsWith(Root + "/", response.Headers.Location!.OriginalString);
        return await response.Content.ReadFromJsonAsync<JsonElement>();
    }
    [Fact]
    public Task Text_lifecycle_preserves_unicode_and_audits_only_metadata() => TestApplicationFactory.WithDatabase(async app =>
    {
        using var tutor = app.Client(); await tutor.Login();
        var item = await Create(tutor, "  Bài học – Tiếng Việt  "); var id = item.GetProperty("id").GetGuid();
        Assert.Equal("Bài học – Tiếng Việt", item.GetProperty("title").GetString());
        Assert.Equal("  Mô tả\nwith whitespace  ", item.GetProperty("description").GetString());
        Assert.Equal("<script>alert('plain text')</script>\nNội dung \U0001F600\n ", item.GetProperty("body").GetString());
        var createdAt = item.GetProperty("createdAt").GetDateTimeOffset();
        app.Clock.Advance(TimeSpan.FromMinutes(1));
        using var edit = await tutor.Post($"{Root}/{id}", new { title = "Revised", description = "", body = "Line one\nDòng hai", version = 1 });
        Assert.Equal(HttpStatusCode.OK, edit.StatusCode);
        item = await edit.Content.ReadFromJsonAsync<JsonElement>(); Assert.Equal(2, item.GetProperty("version").GetInt64());
        Assert.Equal(createdAt, item.GetProperty("createdAt").GetDateTimeOffset()); Assert.True(item.GetProperty("updatedAt").GetDateTimeOffset() > createdAt);
        using var archive = await tutor.Post($"{Root}/{id}/archive", new { version = 2 }); Assert.Equal(HttpStatusCode.OK, archive.StatusCode);
        using var repeat = await tutor.Post($"{Root}/{id}/archive", new { version = 3 }); Assert.Equal(HttpStatusCode.OK, repeat.StatusCode);
        using var forbiddenEdit = await tutor.Post($"{Root}/{id}", new { title = "Overwrite", description = "", body = "", version = 3 });
        Assert.Equal(HttpStatusCode.Conflict, forbiddenEdit.StatusCode); Assert.Contains("content_archived", await forbiddenEdit.Content.ReadAsStringAsync());
        var active = await tutor.GetFromJsonAsync<JsonElement>(Root); Assert.Empty(active.GetProperty("items").EnumerateArray());
        var archived = await tutor.GetFromJsonAsync<JsonElement>(Root + "?archived=true"); var summary = Assert.Single(archived.GetProperty("items").EnumerateArray());
        Assert.False(summary.TryGetProperty("body", out _)); Assert.False(summary.TryGetProperty("authorId", out _));
        using var restore = await tutor.Post($"{Root}/{id}/restore", new { version = 3 }); Assert.Equal(HttpStatusCode.OK, restore.StatusCode);
        var restored = await tutor.GetFromJsonAsync<JsonElement>($"{Root}/{id}"); Assert.Equal("Line one\nDòng hai", restored.GetProperty("body").GetString());
        Assert.Equal(4, restored.GetProperty("version").GetInt64()); Assert.False(restored.GetProperty("archived").GetBoolean());
        await app.InScope(async (db, _) =>
        {
            Assert.Equal(new[] { "content_archive", "content_create", "content_edit", "content_restore" }, await db.Audit.Where(x => x.TargetId == id).OrderBy(x => x.Action).Select(x => x.Action).ToArrayAsync());
            Assert.Equal(1, await db.TextContents.CountAsync()); return 0;
        });
        Assert.DoesNotContain("Nội dung", string.Join('\n', app.Logs.Lines));
    });

    [Fact]
    public Task Every_content_route_denies_anonymous_students_restricted_and_revoked_sessions() => TestApplicationFactory.WithDatabase(async app =>
    {
        using var tutor = app.Client(); await tutor.Login(); var item = await Create(tutor); var id = item.GetProperty("id").GetGuid();
        using var anonymous = app.Client(); using var a = await app.Student(tutor, "content.a"); using var b = await app.Student(tutor, "content.b");
        using var restricted = await app.Student(tutor, "content.temporary", rotate: false);
        foreach (var (client, status) in new[] { (anonymous, HttpStatusCode.Unauthorized), (a, HttpStatusCode.Forbidden), (b, HttpStatusCode.Forbidden), (restricted, HttpStatusCode.Forbidden) })
        {
            foreach (var root in new[] { Root, "/API/V1/CONTENT" })
            {
                foreach (var url in new[] { root, root + "?archived=true", root + "/" + id, root + "/" + Guid.NewGuid() })
                {
                    using var response = await client.GetAsync(url); Assert.Equal(status, response.StatusCode);
                    Assert.DoesNotContain("Bài học", await response.Content.ReadAsStringAsync()); Assert.Equal("no-store", response.Headers.CacheControl!.ToString());
                }
                foreach (var url in new[] { root, root + "/" + id, root + "/" + id + "/archive", root + "/" + id + "/restore" })
                    Assert.Equal(status, (await client.Post(url, new { title = "tamper", description = "", body = "", version = 1 }, csrf: false)).StatusCode);
            }
        }
        Assert.Equal(HttpStatusCode.BadRequest, (await tutor.Post(Root, new { title = "csrf", description = "", body = "" }, csrf: false)).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await tutor.Post(Root, new { title = "origin", description = "", body = "" }, origin: "https://example.invalid")).StatusCode);
        await tutor.Post("/api/v1/auth/logout", new { }); await tutor.AssertStatus(Root, HttpStatusCode.Unauthorized);
        await app.InScope(async (db, _) => { Assert.Equal(1, await db.TextContents.CountAsync()); return 0; });
    });

    [Fact]
    public Task Concurrent_and_stale_writes_never_overwrite_and_failed_audits_roll_back() => TestApplicationFactory.WithDatabase(async app =>
    {
        using var tutor = app.Client(); await tutor.Login(); var item = await Create(tutor); var id = item.GetProperty("id").GetGuid();
        var results = await Task.WhenAll(Enumerable.Range(0, 2).Select(async i =>
        {
            using var other = app.Client(); await other.Login();
            return (await other.Post($"{Root}/{id}", new { title = "Concurrent " + i, description = "", body = "winner " + i, version = 1 })).StatusCode;
        }));
        Assert.Single(results, x => x == HttpStatusCode.OK); Assert.Single(results, x => x == HttpStatusCode.Conflict);
        var winner = await tutor.GetFromJsonAsync<JsonElement>($"{Root}/{id}");
        Assert.Equal(HttpStatusCode.Conflict, (await tutor.Post($"{Root}/{id}/archive", new { version = 1 })).StatusCode);
        // Deliberately violate audit Action length in the same SaveChanges to prove DB transaction atomicity.
        await app.InScope(async (db, _) =>
        {
            var content = await db.TextContents.SingleAsync(x => x.Id == id); content.Title = "must roll back"; content.Version++;
            db.Audit.Add(new() { TargetId = id, Action = new string('x', 41), At = app.Clock.GetUtcNow() });
            await Assert.ThrowsAsync<DbUpdateException>(() => db.SaveChangesAsync()); return 0;
        });
        var after = await tutor.GetFromJsonAsync<JsonElement>($"{Root}/{id}"); Assert.Equal(winner.ToString(), after.ToString());
        await app.InScope(async (db, _) => { Assert.Equal(1, await db.Audit.CountAsync(x => x.TargetId == id && x.Action == "content_edit")); return 0; });
    });

    [Fact]
    public Task Validation_pagination_missing_ids_and_payload_shape_are_bounded() => TestApplicationFactory.WithDatabase(async app =>
    {
        using var tutor = app.Client(); await tutor.Login();
        foreach (var draft in new object[] { new { title = " ", description = "", body = "" }, new { title = new string('x', 201), description = "", body = "" }, new { title = "null\0", description = "", body = "" }, new { title = "x", description = new string('d', 2001), body = "" }, new { title = "x", description = "", body = new string('b', 50001) }, new { title = "x", description = "", body = "null\0" }, new { title = "x", description = "", body = "", authorId = Guid.NewGuid() }, new { title = "missing body" } })
            Assert.Equal(HttpStatusCode.BadRequest, (await tutor.Post(Root, draft)).StatusCode);
        await Create(tutor, "One"); await Create(tutor, "Two");
        foreach (var query in new[] { "?page=0", "?pageSize=101", "?archived=maybe", "?studentId=x", "?page=1000001" }) await tutor.AssertStatus(Root + query, HttpStatusCode.BadRequest);
        var first = await tutor.GetFromJsonAsync<JsonElement>(Root + "?pageSize=1"); var second = await tutor.GetFromJsonAsync<JsonElement>(Root + "?pageSize=1&page=2");
        Assert.Equal(2, first.GetProperty("nextPage").GetInt32()); Assert.Equal(JsonValueKind.Null, second.GetProperty("nextPage").ValueKind);
        Assert.NotEqual(first.GetProperty("items")[0].GetProperty("id").GetGuid(), second.GetProperty("items")[0].GetProperty("id").GetGuid());
        var absent = Root + "/" + Guid.NewGuid(); await tutor.AssertStatus(absent, HttpStatusCode.NotFound);
        Assert.Equal(HttpStatusCode.NotFound, (await tutor.Post(absent + "/restore", new { version = 1 })).StatusCode);
        await app.InScope(async (db, _) => { Assert.Equal(2, await db.TextContents.CountAsync()); return 0; });
    });
}
