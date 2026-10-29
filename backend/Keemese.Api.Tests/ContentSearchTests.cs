using System.Diagnostics;
using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Keemese.Api.Content;
using Keemese.Api.Identity;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using Xunit;
using Xunit.Abstractions;

namespace Keemese.Api.Tests;

public sealed class ContentSearchTests(ITestOutputHelper output)
{
    private const string Root = "/api/v1/content";
    private static async Task<Guid> Create(HttpClient tutor, string title, string description = "", string body = "", Guid? folderId = null)
    {
        using var response = await tutor.Post(Root, new { title, description, body, folderId });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
    }
    private static async Task<Guid[]> Search(HttpClient tutor, string query, string extra = "")
    {
        using var response = await tutor.GetAsync(Root + "?q=" + Uri.EscapeDataString(query) + extra);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode); Assert.Equal("no-store", response.Headers.CacheControl!.ToString());
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        foreach (var item in json.GetProperty("items").EnumerateArray())
            Assert.Equal(new[] { "archived", "createdAt", "description", "folderId", "id", "tags", "title", "updatedAt", "version" }, item.EnumerateObject().Select(x => x.Name).Order().ToArray());
        return json.GetProperty("items").EnumerateArray().Select(x => x.GetProperty("id").GetGuid()).ToArray();
    }
    [Fact]
    public Task Literal_unicode_fields_and_validation_preserve_sources() => TestApplicationFactory.WithDatabase(async app =>
    {
        using var tutor = app.Client(); await tutor.Login();
        var a = await Create(tutor, "Tiếng title", "Description marker", "body-only 😀 đ % _ \\ ' OR 1=1 -- <b>plain</b>\npresent  perfect");
        var b = await Create(tutor, "Other", "tiếng description", "present perfect\nLine break");
        foreach (var q in new[] { "TIẾNG", "tiếng", "  tiếng\u0085" }) Assert.Equal(new[] { a, b }.Order(), (await Search(tutor, q)).Order());
        foreach (var q in new[] { "description marker", "body-only", "😀", "Đ", "%", "_", "\\", "' OR 1=1 --", "<b>plain</b>", "esent  perf" }) Assert.Equal(new[] { a }, await Search(tutor, q));
        Assert.Equal(new[] { b }, await Search(tutor, "present perfect"));
        foreach (var q in new[] { "tieng", "titleDescription", "body-only d", "Line  break" }) Assert.Empty(await Search(tutor, q));
        var isolated = await Create(tutor, "đ", "é", "ﬁ Ａ");
        foreach (var q in new[] { "d", "e", "fi", "A" }) Assert.DoesNotContain(isolated, await Search(tutor, q));
        foreach (var q in new[] { "", " \t\n\u0085 " }) Assert.Equal(3, (await Search(tutor, q)).Length);
        foreach (var q in new[] { new string('x', 200), string.Concat(Enumerable.Repeat("😀", 100)) }) Assert.Empty(await Search(tutor, q));
        foreach (var q in new[] { new string('x', 201), new string(' ', 201), new string('x', 199) + "😀", "a\0b", "a\tb", "a\nb", "a\u007fb", "a\u0085b" })
        {
            using var bad = await tutor.GetAsync(Root + "?q=" + Uri.EscapeDataString(q)); Assert.Equal(HttpStatusCode.BadRequest, bad.StatusCode);
            Assert.Equal("invalid_content_search", (await bad.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("code").GetString());
        }
        foreach (var selector in new[] { "q=x&q=x", "page=1&page=1", "pageSize=25&pageSize=25", "archived=true&archived=true", "folderId=unfiled&folderId=unfiled", "q=x&studentId=x" })
            await tutor.AssertStatus(Root + "?" + selector, HttpStatusCode.BadRequest);
        // .NET test-server Unicode boundaries avoid URI/JSON encoders replacing an unpaired surrogate first.
        Assert.Throws<ApiFault>(() => TextSearch.Query("\ud800"));
        await app.InScope(async (db, identity) =>
        {
            var actor = (await db.Users.SingleAsync(x => x.Role == "Tutor")).Id; var library = new TextLibrary(db, identity, app.Clock);
            foreach (var draft in new[] { new TextDraft("\ud800", "", ""), new TextDraft("valid", "\udc00", ""), new TextDraft("valid", "", "\ud800") })
                Assert.Equal(400, (await Assert.ThrowsAsync<ApiFault>(() => library.CreateAsync(draft, actor))).Status);
            var source = await db.TextContents.SingleAsync(x => x.Id == b); Assert.Equal("tiếng description", source.Description);
            Assert.Equal("TIẾNG DESCRIPTION", source.SearchDescription); return 0;
        });
        var log = string.Join('\n', app.Logs.Lines); Assert.Contains("strpos", log); Assert.DoesNotContain("' OR 1=1 --", log);
        var sql = app.Logs.Lines.Last(x => x.Contains("strpos"));
        Assert.Matches(@"strpos\([^,]+, @\w+\)", sql); Assert.Contains("LIMIT", sql); Assert.Contains("OFFSET", sql); Assert.DoesNotContain("SearchBody", sql.Split("FROM")[0].Split("SELECT").Last());
        output.WriteLine(sql);
    });

    [Fact]
    public Task Filter_intersections_and_tied_order_paginate_after_search() => TestApplicationFactory.WithDatabase(async app =>
    {
        using var tutor = app.Client(); await tutor.Login();
        using var folder = await tutor.Post(Root + "/folders", new { name = "Parent", parentId = (Guid?)null });
        var parent = (await folder.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
        using var childResponse = await tutor.Post(Root + "/folders", new { name = "Child", parentId = parent });
        var child = (await childResponse.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
        var ids = new List<Guid>();
        for (var i = 0; i < 27; i++) ids.Add(await Create(tutor, "needle " + i, folderId: i % 3 == 0 ? parent : i % 3 == 1 ? child : null));
        await Create(tutor, "not a hit"); var archived = ids[0];
        Assert.Equal(HttpStatusCode.OK, (await tutor.Post($"{Root}/{archived}/archive", new { version = 1 })).StatusCode);
        var first = await Search(tutor, "needle"); var second = await Search(tutor, "needle", "&page=2");
        Assert.Equal(25, first.Length); Assert.Single(second); Assert.Equal(ids.Except(new[] { archived }).Order(), first.Concat(second));
        foreach (var filter in new[] { "", "&folderId=unfiled", "&folderId=" + parent, "&folderId=" + child })
        foreach (var archive in new[] { false, true })
        {
            var actual = await Search(tutor, "needle", filter + "&archived=" + archive.ToString().ToLowerInvariant() + "&pageSize=100");
            var expected = ids.Where(id => (id == archived) == archive).Where(id => filter == "" || filter.EndsWith("unfiled") ? filter == "" || ids.IndexOf(id) % 3 == 2 : ids.IndexOf(id) % 3 == (filter.EndsWith(parent.ToString()) ? 0 : 1));
            Assert.Equal(expected.Order(), actual.Order());
        }
        Assert.Empty(await Search(tutor, "needle", "&folderId=" + Guid.NewGuid())); Assert.Empty(await Search(tutor, "needle", "&page=3"));
        Assert.Single(await Search(tutor, "needle", "&pageSize=1"));
        var maximum = await tutor.GetFromJsonAsync<JsonElement>(Root + "?q=needle&page=1000000&pageSize=100"); Assert.Empty(maximum.GetProperty("items").EnumerateArray()); Assert.Equal(JsonValueKind.Null, maximum.GetProperty("nextPage").ValueKind);
    });

    [Fact]
    public Task Search_respects_role_and_session_boundaries_before_query_validation() => TestApplicationFactory.WithDatabase(async app =>
    {
        using var tutor = app.Client(); await tutor.Login(); await Create(tutor, "Private needle");
        using var anonymous = app.Client(); using var a = await app.Student(tutor, "search.a"); using var b = await app.Student(tutor, "search.b"); using var restricted = await app.Student(tutor, "search.temp", rotate: false);
        foreach (var (client, status) in new[] { (anonymous, HttpStatusCode.Unauthorized), (a, HttpStatusCode.Forbidden), (b, HttpStatusCode.Forbidden), (restricted, HttpStatusCode.Forbidden) })
        foreach (var root in new[] { Root, Root.ToUpperInvariant() })
        foreach (var suffix in new[] { "", "?q=needle", "?q=" + new string('x', 201) + "&studentId=bad" })
        {
            using var response = await client.GetAsync(root + suffix); Assert.Equal(status, response.StatusCode); Assert.Equal("no-store", response.Headers.CacheControl!.ToString()); Assert.DoesNotContain("needle", await response.Content.ReadAsStringAsync());
        }
        var student = await tutor.GetFromJsonAsync<JsonElement>("/api/v1/students");
        var profile = student.GetProperty("items").EnumerateArray().Single(x => x.GetProperty("username").GetString() == "search.a");
        await tutor.Post($"/api/v1/students/{profile.GetProperty("id").GetGuid()}/deactivate", new { version = profile.GetProperty("version").GetInt64() });
        await a.AssertStatus(Root + "?q=needle", HttpStatusCode.Unauthorized);
        await tutor.Post("/api/v1/auth/logout", new { }); await tutor.AssertStatus(Root + "?q=needle", HttpStatusCode.Unauthorized);
        using var expired = app.Client(); await expired.Login(); app.Clock.Advance(TimeSpan.FromHours(9)); await expired.AssertStatus(Root + "?q=needle", HttpStatusCode.Unauthorized);
    });

    [Fact]
    public Task Projection_edits_archive_stale_and_failed_audit_are_atomic() => TestApplicationFactory.WithDatabase(async app =>
    {
        using var tutor = app.Client(); await tutor.Login(); var id = await Create(tutor, "Original needle", "Dòng đầu", "Original body");
        await app.InScope(async (db, _) => { await db.Database.ExecuteSqlRawAsync("ALTER TABLE \"Audit\" ADD CONSTRAINT search_fail CHECK (\"Action\" <> 'content_edit')"); return 0; });
        Assert.Equal(HttpStatusCode.ServiceUnavailable, (await tutor.Post($"{Root}/{id}", new { title = "Failed", description = "failed", body = "failed", version = 1 })).StatusCode);
        Assert.Equal(new[] { id }, await Search(tutor, "original body")); Assert.Empty(await Search(tutor, "failed"));
        await app.InScope(async (db, _) => { await db.Database.ExecuteSqlRawAsync("ALTER TABLE \"Audit\" DROP CONSTRAINT search_fail"); Assert.Equal(1, (await db.TextContents.SingleAsync()).Version); return 0; });
        Assert.Equal(HttpStatusCode.OK, (await tutor.Post($"{Root}/{id}", new { title = "Revised", description = "Mới", body = "Tiếng mới", version = 1 })).StatusCode);
        Assert.Empty(await Search(tutor, "original")); Assert.Equal(new[] { id }, await Search(tutor, "tiếng mới"));
        Assert.Equal(HttpStatusCode.Conflict, (await tutor.Post($"{Root}/{id}", new { title = "stale", description = "", body = "stale", version = 1 })).StatusCode);
        await tutor.Post($"{Root}/{id}/archive", new { version = 2 });
        Assert.Equal(HttpStatusCode.Conflict, (await tutor.Post($"{Root}/{id}", new { title = "archived edit", description = "", body = "bad", version = 3 })).StatusCode);
        Assert.Empty(await Search(tutor, "tiếng")); Assert.Equal(new[] { id }, await Search(tutor, "tiếng", "&archived=true"));
        await tutor.Post($"{Root}/{id}/restore", new { version = 3 }); Assert.Equal(new[] { id }, await Search(tutor, "tiếng"));
        await app.InScope(async (db, _) => { var row = await db.TextContents.SingleAsync(); Assert.Equal("TIẾNG MỚI", row.SearchBody); Assert.Equal(4, row.Version); Assert.Equal(4, await db.Audit.CountAsync(x => x.TargetId == id)); return 0; });
    });

    [Fact]
    public Task Bounded_thousand_row_query_plans_use_server_predicates() => TestApplicationFactory.WithDatabase(async app =>
    {
        using var tutor = app.Client(); await tutor.Login();
        await app.InScope(async (db, identity) =>
        {
            var actor = (await db.Users.SingleAsync()).Id;
            var folder = new ContentFolder { Name = "Cost", NormalizedName = "COST", AuthorId = actor }; db.ContentFolders.Add(folder);
            for (var i = 0; i < 1000; i++)
            {
                var row = new TextContent { AuthorId = actor, Title = "cost title " + i, Description = "description", Body = (i == 10 ? "bodyonly " : "") + new string('a', i < 10 ? 50000 : i == 10 ? 1991 : 2000), Archived = i % 4 == 0, FolderId = i % 2 == 0 ? folder.Id : null, CreatedAt = app.Clock.GetUtcNow(), UpdatedAt = app.Clock.GetUtcNow() };
                TextSearch.Project(row); db.TextContents.Add(row);
            }
            await db.SaveChangesAsync(); await db.Database.ExecuteSqlRawAsync("ANALYZE \"TextContents\"");
            await db.Database.OpenConnectionAsync(); var connection = (NpgsqlConnection)db.Database.GetDbConnection();
            await using (var timeout = new NpgsqlCommand("SET statement_timeout = '5s'", connection)) await timeout.ExecuteNonQueryAsync();
            output.WriteLine("PostgreSQL " + connection.PostgreSqlVersion + "; .NET " + Environment.Version + "; OS " + System.Runtime.InteropServices.RuntimeInformation.OSDescription + "; 1000 rows (990x2000-unit +10x50000-unit bodies), mixed folders/archive; statement_timeout5s.");
            foreach (var (query, page) in new[] { ("", 1), ("cost title 999", 1), ("bodyonly", 1), ("absent-needle", 1), ("a", 1), ("", 40) })
            {
                var key = TextSearch.Query(query); var library = new TextLibrary(db, identity, app.Clock);
                var sw = Stopwatch.StartNew(); var actual = await library.ListAsync(false, page, 25, false, null, key); sw.Stop();
                Assert.Equal(query == "absent-needle" || page == 40 ? 0 : query is "bodyonly" or "cost title 999" ? 1 : 26, actual.Count);
                const string predicate = " AND (strpos(\"SearchTitle\", @q)>0 OR strpos(\"SearchDescription\", @q)>0 OR strpos(\"SearchBody\", @q)>0)";
                await using var command = new NpgsqlCommand("EXPLAIN (ANALYZE, BUFFERS) SELECT \"Id\",\"Title\",\"Description\" FROM \"TextContents\" WHERE NOT \"Archived\"" + (key.Length == 0 ? "" : predicate) + " ORDER BY \"UpdatedAt\" DESC,\"Id\" LIMIT 26 OFFSET @offset", connection);
                if (key.Length > 0) command.Parameters.AddWithValue("q", key); command.Parameters.AddWithValue("offset", (page - 1) * 25);
                await using var reader = await command.ExecuteReaderAsync(); var plan = new StringBuilder(); while (await reader.ReadAsync()) plan.AppendLine(reader.GetString(0));
                output.WriteLine($"query={query};page={page};actual_rows={actual.Count};API_query_elapsed_ms={sw.Elapsed.TotalMilliseconds:F2}\n{plan}");
            }
            return 0;
        });
    });
}
