using Keemese.Api.Identity;
using Keemese.Api.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Keemese.Api.Content;

public sealed class ContentTag
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid AuthorId { get; set; }
    public string AuthorRole { get; set; } = "Tutor";
    public string Name { get; set; } = "";
    public string NormalizedName { get; set; } = "";
    public long Version { get; set; } = 1;
}
public sealed class TextContentTag
{
    public Guid TextContentId { get; set; }
    public Guid TagId { get; set; }
    public ContentTag Tag { get; set; } = null!;
}
public sealed record TagDraft(string? Name);
public sealed record EditTag(string? Name, long Version);
public sealed record TagDetail(Guid Id, string Name, long Version);
public sealed record AssignedTag(Guid Id, string Name);

public sealed class ContentTags(WorkspaceDb db, IdentityService identity)
{
    private static TagDetail Detail(ContentTag tag) => new(tag.Id, tag.Name, tag.Version);
    public async Task<List<TagDetail>> ListAsync() => await db.ContentTags.AsNoTracking().OrderBy(x => x.NormalizedName).ThenBy(x => x.Id)
        .Select(x => new TagDetail(x.Id, x.Name, x.Version)).ToListAsync();
    public async Task<TagDetail> GetAsync(Guid id) => Detail(await db.ContentTags.AsNoTracking().SingleOrDefaultAsync(x => x.Id == id) ?? throw new ApiFault(404, "tag_missing"));
    public async Task<TagDetail> SaveAsync(Guid? id, string? name, long? version, Guid actor)
    {
        await using var tx = await db.Database.BeginTransactionAsync(); await db.LockContentAsync();
        var tag = id is Guid existing ? await db.ContentTags.SingleOrDefaultAsync(x => x.Id == existing) ?? throw new ApiFault(404, "tag_missing") : new ContentTag { AuthorId = actor };
        if (id is not null && version <= 0) throw new ApiFault(400, "invalid_request");
        if (id is not null && tag.Version != version) throw new ApiFault(409, "tag_stale");
        name = name?.Trim();
        if (string.IsNullOrEmpty(name) || name.Length > 50 || name.Any(char.IsControl) || !TextSearch.ValidUnicode(name)) throw new ApiFault(400, "invalid_tag_name");
        var key = TextSearch.Key(name);
        if (await db.ContentTags.AnyAsync(x => x.Id != tag.Id && x.NormalizedName == key)) throw new ApiFault(409, "tag_name_exists");
        if (id is not null && tag.Name == name) return Detail(tag);
        if (id is null && await db.ContentTags.CountAsync() >= 1000) throw new ApiFault(409, "tag_limit");
        tag.Name = name; tag.NormalizedName = key;
        if (id is null) db.ContentTags.Add(tag); else tag.Version++;
        identity.Audit(id is null ? "tag_create" : "tag_edit", tag.Id, actor);
        await db.SaveChangesAsync(); await tx.CommitAsync(); return Detail(tag);
    }
    public async Task DeleteAsync(Guid id, long version, Guid actor)
    {
        await using var tx = await db.Database.BeginTransactionAsync(); await db.LockContentAsync();
        var tag = await db.ContentTags.SingleOrDefaultAsync(x => x.Id == id) ?? throw new ApiFault(404, "tag_missing");
        if (version <= 0) throw new ApiFault(400, "invalid_request");
        if (tag.Version != version) throw new ApiFault(409, "tag_stale");
        if (await db.TextContentTags.AnyAsync(x => x.TagId == id)) throw new ApiFault(409, "tag_in_use");
        db.ContentTags.Remove(tag); identity.Audit("tag_delete", id, actor);
        await db.SaveChangesAsync(); await tx.CommitAsync();
    }
    // Caller owns the shared content transaction/lock. Validate the complete set before changing links.
    public static async Task ReplaceAsync(WorkspaceDb db, Guid contentId, Guid[] ids)
    {
        if (ids.Length > 20 || ids.Distinct().Count() != ids.Length) throw new ApiFault(400, "invalid_content_tags");
        if (ids.Length != 0 && await db.ContentTags.CountAsync(x => ids.Contains(x.Id)) != ids.Length) throw new ApiFault(404, "tag_missing");
        var links = await db.TextContentTags.Where(x => x.TextContentId == contentId).ToListAsync();
        db.TextContentTags.RemoveRange(links.Where(x => !ids.Contains(x.TagId)));
        var saved = links.Select(x => x.TagId).ToHashSet();
        db.TextContentTags.AddRange(ids.Where(x => !saved.Contains(x)).Select(id => new TextContentTag { TextContentId = contentId, TagId = id }));
    }
    public static async Task<Dictionary<Guid, AssignedTag[]>> LabelsAsync(WorkspaceDb db, Guid[] ids)
    {
        if (ids.Length == 0) return [];
        var labels = await db.TextContentTags.AsNoTracking().Where(x => ids.Contains(x.TextContentId))
            .OrderBy(x => x.Tag.NormalizedName).ThenBy(x => x.TagId)
            .Select(x => new { x.TextContentId, x.TagId, x.Tag.Name }).ToListAsync();
        return labels.GroupBy(x => x.TextContentId).ToDictionary(x => x.Key, x => x.Select(t => new AssignedTag(t.TagId, t.Name)).ToArray());
    }
}
public static class TagRoutes
{
    public static void MapContentTags(this WebApplication app)
    {
        var routes = app.MapGroup("/api/v1/content/tags");
        static void NoQuery(HttpContext c) { if (c.Request.Query.Count != 0) throw new ApiFault(400, "invalid_pagination"); }
        routes.MapGet("", async (HttpContext c, ContentTags tags) => { NoQuery(c); return Results.Ok(await tags.ListAsync()); });
        routes.MapGet("/{id:guid}", async (Guid id, HttpContext c, ContentTags tags) => { NoQuery(c); return Results.Ok(await tags.GetAsync(id)); });
        routes.MapPost("", async (TagDraft draft, HttpContext c, ContentTags tags) =>
        {
            NoQuery(c); var tag = await tags.SaveAsync(null, draft.Name, null, HttpIdentity.UserId(c)); return Results.Created($"/api/v1/content/tags/{tag.Id}", tag);
        });
        routes.MapPost("/{id:guid}", async (Guid id, EditTag draft, HttpContext c, ContentTags tags) =>
        { NoQuery(c); return Results.Ok(await tags.SaveAsync(id, draft.Name, draft.Version, HttpIdentity.UserId(c))); });
        routes.MapPost("/{id:guid}/delete", async (Guid id, ContentVersion request, HttpContext c, ContentTags tags) =>
        { NoQuery(c); await tags.DeleteAsync(id, request.Version, HttpIdentity.UserId(c)); return Results.NoContent(); });
    }
}
