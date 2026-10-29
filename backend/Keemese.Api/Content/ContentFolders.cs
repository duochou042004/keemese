using System.Text;
using Keemese.Api.Identity;
using Keemese.Api.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Keemese.Api.Content;

public sealed class ContentFolder
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid AuthorId { get; set; }
    public string AuthorRole { get; set; } = "Tutor";
    public Guid? ParentId { get; set; }
    public string Name { get; set; } = "";
    public string NormalizedName { get; set; } = "";
    public long Version { get; set; } = 1;
}
public sealed record FolderDraft(string? Name, Guid? ParentId);
public sealed record EditFolder(string? Name, Guid? ParentId, long Version);
public sealed record FolderDetail(Guid Id, string Name, Guid? ParentId, long Version);

public sealed class ContentFolders(WorkspaceDb db, IdentityService identity)
{
    private static FolderDetail Detail(ContentFolder x) => new(x.Id, x.Name, x.ParentId, x.Version);
    public async Task<List<FolderDetail>> ListAsync() => await db.ContentFolders.AsNoTracking().OrderBy(x => x.Name).ThenBy(x => x.Id)
        .Select(x => new FolderDetail(x.Id, x.Name, x.ParentId, x.Version)).ToListAsync();
    public async Task<FolderDetail> GetAsync(Guid id) => Detail(await db.ContentFolders.AsNoTracking().SingleOrDefaultAsync(x => x.Id == id) ?? throw new ApiFault(404, "folder_missing"));
    private async Task ValidateAsync(ContentFolder folder, string? name, Guid? parent)
    {
        name = name?.Trim();
        if (string.IsNullOrEmpty(name) || name.Length > 100 || name.Contains('\0')) throw new ApiFault(400, "invalid_folder_name");
        string normalized;
        try { normalized = name.Normalize(NormalizationForm.FormC).ToUpperInvariant(); }
        catch (ArgumentException) { throw new ApiFault(400, "invalid_folder_name"); }
        if (await db.ContentFolders.AnyAsync(x => x.Id != folder.Id && x.ParentId == parent && x.NormalizedName == normalized))
            throw new ApiFault(409, "folder_name_exists");
        // Walk ancestors under the shared structure lock: concurrent inverse moves cannot form a cycle.
        var seen = new HashSet<Guid> { folder.Id };
        var current = parent;
        while (current is Guid id)
        {
            if (!seen.Add(id)) throw new ApiFault(409, "folder_cycle");
            var ancestor = await db.ContentFolders.AsNoTracking().SingleOrDefaultAsync(x => x.Id == id) ?? throw new ApiFault(404, "folder_missing");
            current = ancestor.ParentId;
        }
        folder.Name = name; folder.NormalizedName = normalized; folder.ParentId = parent;
    }
    public async Task<FolderDetail> SaveAsync(Guid? id, string? name, Guid? parent, long? version, Guid actor)
    {
        await using var tx = await db.Database.BeginTransactionAsync(); await db.LockContentAsync();
        var folder = id is Guid existing ? await db.ContentFolders.SingleOrDefaultAsync(x => x.Id == existing) ?? throw new ApiFault(404, "folder_missing")
            : new ContentFolder { AuthorId = actor };
        if (id is not null && folder.Version != version) throw new ApiFault(409, "folder_stale");
        if (id is null && await db.ContentFolders.CountAsync() >= 1000) throw new ApiFault(409, "folder_limit");
        await ValidateAsync(folder, name, parent);
        if (id is null) db.ContentFolders.Add(folder); else folder.Version++;
        identity.Audit(id is null ? "folder_create" : "folder_edit", folder.Id, actor);
        await db.SaveChangesAsync(); await tx.CommitAsync(); return Detail(folder);
    }
    public async Task DeleteAsync(Guid id, long version, Guid actor)
    {
        await using var tx = await db.Database.BeginTransactionAsync(); await db.LockContentAsync();
        var folder = await db.ContentFolders.SingleOrDefaultAsync(x => x.Id == id) ?? throw new ApiFault(404, "folder_missing");
        if (folder.Version != version) throw new ApiFault(409, "folder_stale");
        if (await db.ContentFolders.AnyAsync(x => x.ParentId == id) || await db.TextContents.AnyAsync(x => x.FolderId == id))
            throw new ApiFault(409, "folder_not_empty");
        db.ContentFolders.Remove(folder); identity.Audit("folder_delete", id, actor);
        await db.SaveChangesAsync(); await tx.CommitAsync();
    }
}

public static class FolderRoutes
{
    public static void MapContentFolders(this WebApplication app)
    {
        var routes = app.MapGroup("/api/v1/content/folders");
        routes.MapGet("", async (HttpContext c, ContentFolders folders) =>
        {
            if (c.Request.Query.Count != 0) throw new ApiFault(400, "invalid_pagination");
            return Results.Ok(await folders.ListAsync());
        });
        routes.MapGet("/{id:guid}", async (Guid id, ContentFolders folders) => Results.Ok(await folders.GetAsync(id)));
        routes.MapPost("", async (FolderDraft draft, HttpContext c, ContentFolders folders) =>
        {
            var item = await folders.SaveAsync(null, draft.Name, draft.ParentId, null, HttpIdentity.UserId(c));
            return Results.Created($"/api/v1/content/folders/{item.Id}", item);
        });
        routes.MapPost("/{id:guid}", async (Guid id, EditFolder draft, HttpContext c, ContentFolders folders) =>
            Results.Ok(await folders.SaveAsync(id, draft.Name, draft.ParentId, draft.Version, HttpIdentity.UserId(c))));
        routes.MapPost("/{id:guid}/delete", async (Guid id, ContentVersion request, HttpContext c, ContentFolders folders) =>
        {
            await folders.DeleteAsync(id, request.Version, HttpIdentity.UserId(c)); return Results.NoContent();
        });
    }
}
