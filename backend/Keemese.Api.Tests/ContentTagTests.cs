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
public sealed class ContentTagTests(ITestOutputHelper output)
{
    private const string Root = "/api/v1/content";
    private static async Task<JsonElement> Tag(HttpClient tutor, string name)
    {
        using var result = await tutor.Post(Root + "/tags", new { name }); Assert.Equal(HttpStatusCode.Created, result.StatusCode);
        var item = await result.Content.ReadFromJsonAsync<JsonElement>(); Assert.Equal(new[] { "id", "name", "version" }, item.EnumerateObject().Select(x => x.Name).Order()); return item;
    }
    private static Guid Id(JsonElement item) => item.GetProperty("id").GetGuid();
    private static async Task<JsonElement> Text(HttpClient tutor, Guid[]? ids, Guid? folderId = null)
    {
        using var response = await tutor.Post(Root, new { title = "Needle text", description = "", body = "Original tiếng Việt", tagIds = ids, folderId });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode); return await response.Content.ReadFromJsonAsync<JsonElement>();
    }
    private static async Task<JsonElement> Get(HttpClient tutor, string path) => await tutor.GetFromJsonAsync<JsonElement>(Root + path);
    private static Guid[] Tags(JsonElement item) => item.GetProperty("tags").EnumerateArray().Select(Id).ToArray();
    [Fact]
    public Task Catalog_unicode_limits_noop_and_live_rename_preserve_source() => TestApplicationFactory.WithDatabase(async app =>
    {
        using var tutor = app.Client(); await tutor.Login(); var tag = await Tag(tutor, "  Tiếng Việt  "); var id = Id(tag);
        Assert.Equal("Tiếng Việt", tag.GetProperty("name").GetString());
        Assert.Equal(HttpStatusCode.Conflict, (await tutor.Post(Root + "/tags", new { name = "TIẾNG VIỆT" })).StatusCode);
        var accent = await Tag(tutor, "Tieng Viet"); await Tag(tutor, "đ"); await Tag(tutor, "d");
        foreach (var name in new[] { "", " ", new string('x', 51), "a\0b", "a\tb", "a\u0085b" }) Assert.Equal(HttpStatusCode.BadRequest, (await tutor.Post(Root + "/tags", new { name })).StatusCode);
        await Tag(tutor, new string('x', 50)); await Tag(tutor, string.Concat(Enumerable.Repeat("😀", 25)));
        var source = await Text(tutor, [id]);
        Assert.Equal(HttpStatusCode.OK, (await tutor.Post($"{Root}/tags/{id}", new { name = "Tiếng Việt ", version = 1 })).StatusCode);
        Assert.Equal(1, (await Get(tutor, $"/tags/{id}")).GetProperty("version").GetInt64());
        Assert.Equal(HttpStatusCode.OK, (await tutor.Post($"{Root}/tags/{id}", new { name = "TIẾNG VIỆT", version = 1 })).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await tutor.Post($"{Root}/tags/{id}", new { name = "Stale", version = 1 })).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await tutor.Post($"{Root}/tags/{id}", new { name = "Tieng Viet", version = 2 })).StatusCode);
        var after = await Get(tutor, "/" + Id(source));
        Assert.Equal("TIẾNG VIỆT", after.GetProperty("tags")[0].GetProperty("name").GetString()); Assert.Equal(1, after.GetProperty("version").GetInt64());
        Assert.Equal(source.GetProperty("updatedAt").ToString(), after.GetProperty("updatedAt").ToString()); Assert.Equal("Original tiếng Việt", after.GetProperty("body").GetString());
        await app.InScope(async (db, identity) =>
        {
            var actor = (await db.Users.SingleAsync()).Id;
            Assert.Equal(400, (await Assert.ThrowsAsync<ApiFault>(() => new ContentTags(db, identity).SaveAsync(null, "\ud800", null, actor))).Status);
            Assert.Equal(1, await db.Audit.CountAsync(x => x.TargetId == id && x.Action == "tag_edit"));
            Assert.Equal("ORIGINAL TIẾNG VIỆT", (await db.TextContents.SingleAsync()).SearchBody);
            var count = await db.ContentTags.CountAsync();
            db.ContentTags.AddRange(Enumerable.Range(0, 1000-count).Select(i => new ContentTag { Name = "Cap " + i, NormalizedName = "CAP " + i, AuthorId = actor })); await db.SaveChangesAsync(); return 0;
        });
        var cap = await tutor.Post(Root + "/tags", new { name = "Over cap" }); Assert.Equal(HttpStatusCode.Conflict, cap.StatusCode); Assert.Contains("tag_limit", await cap.Content.ReadAsStringAsync());
        Assert.Equal(HttpStatusCode.NoContent, (await tutor.Post($"{Root}/tags/{Id(accent)}/delete", new { version = 1 })).StatusCode);
    });
    [Fact]
    public Task Complete_tag_sets_compatibility_archive_and_rollback_are_atomic() => TestApplicationFactory.WithDatabase(async app =>
    {
        using var tutor = app.Client(); await tutor.Login(); var ids = new List<Guid>(); for (var i=0;i<21;i++) ids.Add(Id(await Tag(tutor, "Term " + i)));
        var text = await Text(tutor, ids.Take(20).ToArray()); var id = Id(text); Assert.Equal(20, Tags(text).Length);
        foreach (var set in new[] { ids.ToArray(), new[] { ids[0], ids[0] }, new[] { Guid.NewGuid() } })
            Assert.Equal(set.Length == 1 ? HttpStatusCode.NotFound : HttpStatusCode.BadRequest, (await tutor.Post($"{Root}/{id}", new { title="bad",description="",body="",version=1,tagIds=set })).StatusCode);
        using var omitted = await tutor.Post($"{Root}/{id}", new { title="Saved",description="",body="Original tiếng Việt",version=1 }); Assert.Equal(20, Tags(await omitted.Content.ReadFromJsonAsync<JsonElement>()).Length);
        using var nullSet = await tutor.Post($"{Root}/{id}", new { title="Saved",description="",body="Original tiếng Việt",version=2,tagIds=(Guid[]?)null }); Assert.Equal(20, Tags(await nullSet.Content.ReadFromJsonAsync<JsonElement>()).Length);
        await app.InScope(async (db, _) => { await db.Database.ExecuteSqlRawAsync("ALTER TABLE \"Audit\" ADD CONSTRAINT tag_failure CHECK (\"Action\" <> 'content_edit') NOT VALID"); return 0; });
        Assert.Equal(HttpStatusCode.ServiceUnavailable, (await tutor.Post($"{Root}/{id}", new { title="rollback",description="",body="bad",version=3,tagIds=new[] { ids[20] } })).StatusCode);
        Assert.Equal(20, Tags(await Get(tutor, "/"+id)).Length);
        await app.InScope(async (db, _) => { await db.Database.ExecuteSqlRawAsync("ALTER TABLE \"Audit\" DROP CONSTRAINT tag_failure"); return 0; });
        Assert.Equal(HttpStatusCode.Conflict, (await tutor.Post($"{Root}/{id}", new { title="stale",description="",body="bad",version=1,tagIds=Array.Empty<Guid>() })).StatusCode);
        await tutor.Post($"{Root}/{id}/archive",new {version=3});
        Assert.Equal(HttpStatusCode.Conflict,(await tutor.Post($"{Root}/tags/{ids[0]}/delete",new {version=1})).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict,(await tutor.Post($"{Root}/{id}",new {title="archived",description="",body="",version=4,tagIds=Array.Empty<Guid>()})).StatusCode);
        await tutor.Post($"{Root}/{id}/restore",new {version=4}); Assert.Equal(20,Tags(await Get(tutor,"/"+id)).Length);
        await tutor.Post($"{Root}/{id}",new {title="Saved",description="",body="Original tiếng Việt",version=5,tagIds=Array.Empty<Guid>()}); Assert.Empty(Tags(await Get(tutor,"/"+id)));
        Assert.Equal(HttpStatusCode.NoContent,(await tutor.Post($"{Root}/tags/{ids[0]}/delete",new {version=1})).StatusCode);
        await app.InScope(async (db, _) => { Assert.Empty(await db.TextContentTags.ToListAsync()); Assert.Equal(6,(await db.TextContents.SingleAsync()).Version); return 0; });
    });
    [Fact]
    public Task Races_catalog_audit_and_relational_guards_never_leave_partial_state() => TestApplicationFactory.WithDatabase(async app =>
    {
        using var tutor=app.Client();await tutor.Login();
        var creates=await Task.WhenAll(tutor.Post(Root+"/tags",new {name="Café"}),tutor.Post(Root+"/tags",new {name="CAFE\u0301"}));
        Assert.Single(creates,x=>x.StatusCode==HttpStatusCode.Created);Assert.Single(creates,x=>x.StatusCode==HttpStatusCode.Conflict);
        var a=Id(await Tag(tutor,"A"));var b=Id(await Tag(tutor,"B"));
        var renames=await Task.WhenAll(tutor.Post($"{Root}/tags/{a}",new {name="Race",version=1}),tutor.Post($"{Root}/tags/{b}",new {name="RACE",version=1}));
        Assert.Single(renames,x=>x.StatusCode==HttpStatusCode.OK);Assert.Single(renames,x=>x.StatusCode==HttpStatusCode.Conflict);
        var unused=Id(await Tag(tutor,"Disposable"));
        var race=await Task.WhenAll(tutor.Post($"{Root}/tags/{unused}/delete",new {version=1}),tutor.Post(Root,new {title="race",description="",body="",tagIds=new[]{unused}}));
        Assert.True((race[0].StatusCode==HttpStatusCode.NoContent&&race[1].StatusCode==HttpStatusCode.NotFound)||(race[0].StatusCode==HttpStatusCode.Conflict&&race[1].StatusCode==HttpStatusCode.Created));
        await app.InScope(async (db,_)=>{await db.Database.ExecuteSqlRawAsync("ALTER TABLE \"Audit\" ADD CONSTRAINT tag_failure CHECK (\"Action\" <> 'tag_edit') NOT VALID");return 0;});
        var rollback=Id(await Tag(tutor,"Rollback"));Assert.Equal(HttpStatusCode.ServiceUnavailable,(await tutor.Post($"{Root}/tags/{rollback}",new {name="Changed",version=1})).StatusCode);Assert.Equal("Rollback",(await Get(tutor,$"/tags/{rollback}")).GetProperty("name").GetString());
        var text=await Text(tutor,[rollback]);
        await app.InScope(async (db,_)=>{db.TextContentTags.Add(new(){TextContentId=Id(text),TagId=Guid.NewGuid()});await Assert.ThrowsAsync<DbUpdateException>(()=>db.SaveChangesAsync());return 0;});
        await app.InScope(async (db,_)=>{await Assert.ThrowsAsync<Npgsql.PostgresException>(()=>db.Database.ExecuteSqlRawAsync("DELETE FROM \"ContentTags\" WHERE \"Name\" = 'Rollback'"));return 0;});
        await app.InScope(async (db,_)=>{await Assert.ThrowsAsync<Npgsql.PostgresException>(()=>db.Database.ExecuteSqlInterpolatedAsync($"INSERT INTO \"TextContentTags\" (\"TextContentId\",\"TagId\") VALUES ({Id(text)},{rollback})"));return 0;});
    });
    [Fact]
    public Task All_tag_routes_preserve_identity_case_csrf_and_query_boundaries() => TestApplicationFactory.WithDatabase(async app =>
    {
        using var tutor=app.Client();await tutor.Login();var tag=Id(await Tag(tutor,"Private"));using var anonymous=app.Client();using var a=await app.Student(tutor,"tag.a");using var b=await app.Student(tutor,"tag.b");using var restricted=await app.Student(tutor,"tag.temp",rotate:false);
        foreach(var(client,status)in new[]{(anonymous,HttpStatusCode.Unauthorized),(a,HttpStatusCode.Forbidden),(b,HttpStatusCode.Forbidden),(restricted,HttpStatusCode.Forbidden)})
        foreach(var root in new[]{Root,Root.ToUpperInvariant()})
        {
            foreach(var suffix in new[]{"/tags","/tags/"+tag,"/tags/"+Guid.NewGuid(),"?tagId="+tag,"/tags?studentId=bad"}) await client.AssertStatus(root+suffix,status);
            foreach(var suffix in new[]{"/tags","/tags/"+tag,"/tags/"+tag+"/delete"})Assert.Equal(status,(await client.Post(root+suffix,new{name="tamper",version=1},csrf:false)).StatusCode);
        }
        foreach (var suffix in new[] { "/tags", "/tags/"+tag, "/tags/"+tag+"/delete" })
        {
            object payload = suffix == "/tags" ? new { name = "Guard test" } : suffix.EndsWith("/delete") ? new { version = 1 } : new { name = "Guard test", version = 1 };
            using var csrf = await tutor.Post(Root+suffix, payload, csrf:false);
            Assert.Equal(HttpStatusCode.BadRequest, csrf.StatusCode); Assert.Contains("invalid_csrf", await csrf.Content.ReadAsStringAsync());
            using var origin = await tutor.Post(Root+suffix, payload, origin:"https://example.invalid");
            Assert.Equal(HttpStatusCode.BadRequest, origin.StatusCode); Assert.Contains("invalid_origin", await origin.Content.ReadAsStringAsync());
        }
        foreach(var suffix in new[]{"?tagId=bad","?tagId=","?tagId=untagged&tagId=untagged","/tags?foo=x","/tags/"+tag+"?foo=x"})await tutor.AssertStatus(Root+suffix,HttpStatusCode.BadRequest);
        Assert.Equal(HttpStatusCode.BadRequest,(await tutor.Post(Root+"/tags",new{name="unknown",authorId=tag})).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest,(await tutor.Post(Root,new{title="malformed",description="",body="",tagIds=new[]{"bad"}})).StatusCode);
        var students=await tutor.GetFromJsonAsync<JsonElement>("/api/v1/students");var profile=students.GetProperty("items").EnumerateArray().Single(x=>x.GetProperty("username").GetString()=="tag.a");
        await tutor.Post($"/api/v1/students/{Id(profile)}/deactivate",new{version=profile.GetProperty("version").GetInt64()});await a.AssertStatus(Root+"/tags",HttpStatusCode.Unauthorized);
        await tutor.Post("/api/v1/auth/logout",new{});await tutor.AssertStatus(Root+"/tags",HttpStatusCode.Unauthorized);
        using var expired=app.Client();await expired.Login();app.Clock.Advance(TimeSpan.FromHours(9));await expired.AssertStatus(Root+"/tags",HttpStatusCode.Unauthorized);
    });
    [Fact]
    public Task Tag_folder_archive_search_intersections_page_without_duplicates_or_body() => TestApplicationFactory.WithDatabase(async app =>
    {
        using var tutor=app.Client();await tutor.Login();var a=Id(await Tag(tutor,"Alpha"));var b=Id(await Tag(tutor,"Beta"));using var folderResponse=await tutor.Post(Root+"/folders",new{name="Tagged",parentId=(Guid?)null});var folder=Id(await folderResponse.Content.ReadFromJsonAsync<JsonElement>());
        var ids=new List<Guid>();for(var i=0;i<27;i++)ids.Add(Id(await Text(tutor,[a,b],i%2==0?folder:null)));var blank=Id(await Text(tutor,[]));await tutor.Post($"{Root}/{ids[0]}/archive",new{version=1});
        var first=await Get(tutor,"?tagId="+a);var second=await Get(tutor,"?tagId="+a+"&page=2");var pageRows=first.GetProperty("items").EnumerateArray().Concat(second.GetProperty("items").EnumerateArray()).ToArray();
        Assert.Equal(ids.Skip(1).Order(),pageRows.Select(Id));Assert.Equal(26,pageRows.Select(Id).Distinct().Count());
        foreach(var row in pageRows){Assert.False(row.TryGetProperty("body",out _));Assert.Equal(new[]{a,b},Tags(row));Assert.Equal(new[]{"id","name"},row.GetProperty("tags")[0].EnumerateObject().Select(x=>x.Name).Order());}
        foreach(var archive in new[]{false,true})foreach(var f in new[]{"", "&folderId=unfiled", "&folderId="+folder})
        {var result=await Get(tutor,"?tagId="+a+"&q=needle&pageSize=100&archived="+archive.ToString().ToLowerInvariant()+f);var expected=ids.Where((id,i)=>(i==0)==archive&&(f==""||(f.EndsWith("unfiled")?i%2==1:i%2==0)));Assert.Equal(expected.Order(),result.GetProperty("items").EnumerateArray().Select(Id).Order());}
        Assert.Equal(blank,Id(Assert.Single((await Get(tutor,"?tagId=untagged")).GetProperty("items").EnumerateArray())));Assert.Empty((await Get(tutor,"?tagId="+Guid.NewGuid())).GetProperty("items").EnumerateArray());
        Assert.Empty((await Get(tutor,"?tagId="+a+"&q=Alpha")).GetProperty("items").EnumerateArray());
        var sql=app.Logs.Lines.Last(x=>x.Contains("EXISTS")&&x.Contains("LIMIT"));Assert.Contains("@",sql);Assert.Contains("OFFSET",sql);Assert.DoesNotContain("Body",sql.Split("SELECT").Last().Split("FROM")[0]);output.WriteLine(sql);
    });
    [Fact]
    public Task Thousand_text_twenty_link_cost_is_bounded_and_labels_use_one_batch() => TestApplicationFactory.WithDatabase(async app =>
    {
        using var tutor=app.Client();await tutor.Login();await app.InScope(async(db,identity)=>
        {
            var actor=(await db.Users.SingleAsync()).Id;var tags=Enumerable.Range(0,1000).Select(i=>new ContentTag{AuthorId=actor,Name="Term "+i,NormalizedName="TERM "+i}).ToArray();db.ContentTags.AddRange(tags);var folder=new ContentFolder{AuthorId=actor,Name="Cost",NormalizedName="COST"};db.ContentFolders.Add(folder);
            for(var i=0;i<1000;i++){var text=new TextContent{AuthorId=actor,Title="cost "+i,Body="body",FolderId=i%2==0?folder.Id:null,Archived=i%4==0,CreatedAt=app.Clock.GetUtcNow(),UpdatedAt=app.Clock.GetUtcNow()};TextSearch.Project(text);db.TextContents.Add(text);db.TextContentTags.AddRange(Enumerable.Range(0,20).Select(j=>new TextContentTag{TextContentId=text.Id,TagId=tags[(i+j)%1000].Id}));}
            await db.SaveChangesAsync();await db.Database.ExecuteSqlRawAsync("ANALYZE \"TextContentTags\"");await db.Database.ExecuteSqlRawAsync("ANALYZE \"TextContents\"");await db.Database.OpenConnectionAsync();var connection=(NpgsqlConnection)db.Database.GetDbConnection();await using(var timeout=new NpgsqlCommand("SET statement_timeout = '5s'",connection))await timeout.ExecuteNonQueryAsync();
            output.WriteLine($"PostgreSQL{connection.PostgreSqlVersion};.NET{Environment.Version};1000 texts,20000 links,1000 terms;5s connection-only timeout;{System.Runtime.InteropServices.RuntimeInformation.OSDescription}");
            foreach(var(kind,page)in new[]{("tag",1),("untagged",1),("combined",1),("tag",40)})
            {
                var before=app.Logs.Lines.Count(x=>x.Contains("Executed DbCommand"));var sw=Stopwatch.StartNew();var rows=await new TextLibrary(db,identity,app.Clock).ListAsync(false,page,25,kind=="combined",folder.Id,kind=="combined"?"COST":"",true,kind=="untagged"?null:tags[0].Id);sw.Stop();var commands=app.Logs.Lines.Count(x=>x.Contains("Executed DbCommand"))-before;Assert.Equal(rows.Count>0?2:1,commands);Assert.Equal(kind=="untagged"||page==40?0:kind=="combined"?5:15,rows.Count);Assert.All(rows,row=>Assert.Equal(20,row.Tags.Length));var payloadBytes=Encoding.UTF8.GetByteCount(JsonSerializer.Serialize(rows));Assert.True(payloadBytes<65536);
                var predicate=kind=="untagged"?"NOT EXISTS (SELECT 1 FROM \"TextContentTags\" j WHERE j.\"TextContentId\"=t.\"Id\")":"EXISTS (SELECT 1 FROM \"TextContentTags\" j WHERE j.\"TextContentId\"=t.\"Id\" AND j.\"TagId\"=@tag)";
                await using var cmd=new NpgsqlCommand("EXPLAIN (ANALYZE, BUFFERS) SELECT t.\"Id\",t.\"Title\" FROM \"TextContents\" t WHERE NOT t.\"Archived\" AND "+predicate+(kind=="combined"?" AND t.\"FolderId\"=@folder AND strpos(t.\"SearchTitle\",@q)>0":"")+" ORDER BY t.\"UpdatedAt\" DESC,t.\"Id\" LIMIT 26 OFFSET @offset",connection);if(kind!="untagged")cmd.Parameters.AddWithValue("tag",tags[0].Id);if(kind=="combined"){cmd.Parameters.AddWithValue("folder",folder.Id);cmd.Parameters.AddWithValue("q","COST");}cmd.Parameters.AddWithValue("offset",(page-1)*25);
                await using var reader=await cmd.ExecuteReaderAsync();var plan=new StringBuilder();while(await reader.ReadAsync())plan.AppendLine(reader.GetString(0));output.WriteLine($"shape={kind};page={page};rows={rows.Count};commands={commands};payload_bytes={payloadBytes};service_ms={sw.Elapsed.TotalMilliseconds:F2}\n{plan}");
            }
            return 0;
        });
    });
}
