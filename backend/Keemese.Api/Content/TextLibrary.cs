using Keemese.Api.Identity;
using Keemese.Api.Persistence;
using Microsoft.EntityFrameworkCore;
using System.Text;

namespace Keemese.Api.Content;

public sealed class TextContent
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid? FolderId { get; set; }
    public Guid AuthorId { get; set; }
    public string AuthorRole { get; set; } = "Tutor";
    public string Title { get; set; } = "";
    public string Description { get; set; } = "";
    public string Body { get; set; } = "";
    public string SearchTitle { get; set; } = "";
    public string SearchDescription { get; set; } = "";
    public string SearchBody { get; set; } = "";
    public bool Archived { get; set; }
    public long Version { get; set; } = 1;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
public sealed record TextDraft(string? Title, string? Description, string? Body, Guid? FolderId = null, Guid[]? TagIds = null);
public sealed record EditText(string? Title, string? Description, string? Body, long Version, Guid? FolderId = null, Guid[]? TagIds = null);
public sealed record ContentVersion(long Version);
public sealed record TextSummary(Guid Id, string Title, string Description, bool Archived, long Version, DateTimeOffset CreatedAt, DateTimeOffset UpdatedAt, Guid? FolderId)
{
    public AssignedTag[] Tags { get; init; } = [];
}
public sealed record TextDetail(Guid Id, string Title, string Description, string Body, bool Archived, long Version, DateTimeOffset CreatedAt, DateTimeOffset UpdatedAt, Guid? FolderId)
{
    public AssignedTag[] Tags { get; init; } = [];
}

public static class TextSearch
{
    public static string Key(string value) => value.Normalize(NormalizationForm.FormC).ToUpperInvariant().Normalize(NormalizationForm.FormC);
    public static bool ValidUnicode(string value)
    {
        try { _ = value.Normalize(NormalizationForm.FormC); return true; }
        catch (ArgumentException) { return false; }
    }
    public static string Query(string value)
    {
        if (value.Length > 200 || !ValidUnicode(value)) throw new ApiFault(400, "invalid_content_search");
        value = value.Trim();
        if (value.Any(char.IsControl)) throw new ApiFault(400, "invalid_content_search");
        return Key(value);
    }
    public static void Project(TextContent item)
    {
        item.SearchTitle = Key(item.Title); item.SearchDescription = Key(item.Description); item.SearchBody = Key(item.Body);
    }
}

public sealed class TextLibrary(WorkspaceDb db, IdentityService identity, TimeProvider time)
{
    private static (string Title, string Description, string Body) Validate(string? title, string? description, string? body)
    {
        title = title?.Trim(); description ??= ""; body ??= "";
        if (string.IsNullOrEmpty(title) || title.Length > 200 || title.Contains('\0') || !TextSearch.ValidUnicode(title)) throw new ApiFault(400, "invalid_content_title");
        if (description.Length > 2000 || body.Length > 50000 || description.Contains('\0') || body.Contains('\0') || !TextSearch.ValidUnicode(description) || !TextSearch.ValidUnicode(body)) throw new ApiFault(400, "invalid_content_text");
        return (title, description, body);
    }
    private async Task<TextDetail> DetailAsync(TextContent x)
    {
        var labels = await ContentTags.LabelsAsync(db, [x.Id]);
        return new(x.Id, x.Title, x.Description, x.Body, x.Archived, x.Version, x.CreatedAt, x.UpdatedAt, x.FolderId) { Tags = labels.GetValueOrDefault(x.Id, []) };
    }
    public async Task<TextDetail> CreateAsync(TextDraft draft, Guid actor)
    {
        await using var tx = await db.Database.BeginTransactionAsync(); await db.LockContentAsync();
        await ValidateFolderAsync(draft.FolderId);
        var (title, description, body) = Validate(draft.Title, draft.Description, draft.Body);
        var item = new TextContent { AuthorId = actor, FolderId = draft.FolderId, Title = title, Description = description, Body = body, CreatedAt = time.GetUtcNow(), UpdatedAt = time.GetUtcNow() };
        TextSearch.Project(item);
        db.TextContents.Add(item);
        await ContentTags.ReplaceAsync(db, item.Id, draft.TagIds ?? []);
        identity.Audit("content_create", item.Id, actor);
        await db.SaveChangesAsync(); // Content and audit share EF's atomic SaveChanges transaction.
        var detail = await DetailAsync(item); await tx.CommitAsync(); return detail;
    }
    private async Task ValidateFolderAsync(Guid? folder)
    {
        if (folder is Guid id && !await db.ContentFolders.AnyAsync(x => x.Id == id)) throw new ApiFault(404, "folder_missing");
    }
    public async Task<TextDetail> GetAsync(Guid id)
    {
        await using var tx = await db.Database.BeginTransactionAsync(System.Data.IsolationLevel.RepeatableRead);
        var item = await db.TextContents.AsNoTracking().SingleOrDefaultAsync(x => x.Id == id) ?? throw new ApiFault(404, "content_missing");
        var detail = await DetailAsync(item); await tx.CommitAsync(); return detail;
    }
    public async Task<List<TextSummary>> ListAsync(bool archived, int page, int size, bool filterFolder, Guid? folder, string query = "", bool filterTag = false, Guid? tag = null)
    {
        await using var tx = await db.Database.BeginTransactionAsync(System.Data.IsolationLevel.RepeatableRead);
        var rows = db.TextContents.AsNoTracking().Where(x => x.Archived == archived && (!filterFolder || x.FolderId == folder));
        if (filterTag) rows = tag is Guid tagId ? rows.Where(x => db.TextContentTags.Any(t => t.TextContentId == x.Id && t.TagId == tagId)) : rows.Where(x => !db.TextContentTags.Any(t => t.TextContentId == x.Id));
        if (query.Length > 0)
            rows = rows.Where(x => x.SearchTitle.IndexOf(query) >= 0 || x.SearchDescription.IndexOf(query) >= 0 || x.SearchBody.IndexOf(query) >= 0);
        var summaries = await rows.OrderByDescending(x => x.UpdatedAt).ThenBy(x => x.Id)
            .Skip((page - 1) * size).Take(size + 1)
            .Select(x => new TextSummary(x.Id, x.Title, x.Description, x.Archived, x.Version, x.CreatedAt, x.UpdatedAt, x.FolderId)).ToListAsync();
        var labels = await ContentTags.LabelsAsync(db, summaries.Select(x => x.Id).ToArray());
        var result = summaries.Select(x => x with { Tags = labels.GetValueOrDefault(x.Id, []) }).ToList();
        await tx.CommitAsync(); return result;
    }
    public async Task<TextDetail> UpdateAsync(Guid id, long version, EditText? draft, bool? archived, Guid actor)
    {
        await using var tx = await db.Database.BeginTransactionAsync(); await db.LockContentAsync();
        var item = await db.TextContents.SingleOrDefaultAsync(x => x.Id == id) ?? throw new ApiFault(404, "content_missing");
        if (version != item.Version) throw new ApiFault(409, "content_stale");
        if (draft is not null)
        {
            if (item.Archived) throw new ApiFault(409, "content_archived");
            await ValidateFolderAsync(draft.FolderId); item.FolderId = draft.FolderId;
            (item.Title, item.Description, item.Body) = Validate(draft.Title, draft.Description, draft.Body);
            TextSearch.Project(item);
            if (draft.TagIds is not null) await ContentTags.ReplaceAsync(db, item.Id, draft.TagIds);
        }
        else
        {
            if (item.Archived == archived) return await DetailAsync(item); // Current-version retry has no duplicate audit.
            item.Archived = archived!.Value;
        }
        item.Version++; item.UpdatedAt = time.GetUtcNow();
        identity.Audit(draft is not null ? "content_edit" : archived == true ? "content_archive" : "content_restore", item.Id, actor);
        try { await db.SaveChangesAsync(); }
        catch (DbUpdateConcurrencyException) { throw new ApiFault(409, "content_stale"); }
        var detail = await DetailAsync(item); await tx.CommitAsync(); return detail;
    }
}

public static class ContentRoutes
{
    public static void MapTextLibrary(this WebApplication app)
    {
        var routes = app.MapGroup("/api/v1/content");
        routes.MapGet("", async (HttpContext c, TextLibrary library) =>
        {
            if (c.Request.Query.Keys.Any(x => x is not ("page" or "pageSize" or "archived" or "folderId" or "q" or "tagId"))) throw new ApiFault(400, "invalid_pagination");
            foreach (var entry in c.Request.Query)
                if (entry.Value.Count != 1) throw new ApiFault(400, entry.Key == "q" ? "invalid_content_search" : entry.Key == "tagId" ? "invalid_tag_filter" : "invalid_pagination");
            var query = TextSearch.Query(c.Request.Query["q"].ToString());
            static int Number(string? value, int fallback, int max) => value is null ? fallback : int.TryParse(value, out var n) && n >= 1 && n <= max ? n : throw new ApiFault(400, "invalid_pagination");
            var page = Number(c.Request.Query["page"], 1, 1000000); var size = Number(c.Request.Query["pageSize"], 25, 100);
            var filter = c.Request.Query["archived"].ToString();
            if (filter is not ("" or "true" or "false")) throw new ApiFault(400, "invalid_pagination");
            var filterFolder = c.Request.Query.ContainsKey("folderId");
            Guid? folder = null;
            if (filterFolder && c.Request.Query["folderId"] != "unfiled")
                folder = Guid.TryParse(c.Request.Query["folderId"], out var id) ? id : throw new ApiFault(400, "invalid_pagination");
            var filterTag = c.Request.Query.ContainsKey("tagId");
            Guid? tag = null;
            if (filterTag && c.Request.Query["tagId"] != "untagged")
                tag = Guid.TryParse(c.Request.Query["tagId"], out var tagId) ? tagId : throw new ApiFault(400, "invalid_tag_filter");
            var rows = await library.ListAsync(filter == "true", page, size, filterFolder, folder, query, filterTag, tag);
            return Results.Ok(new { items = rows.Take(size), nextPage = rows.Count > size && page < 1000000 ? (int?)(page + 1) : null });
        });
        routes.MapGet("/{id:guid}", async (Guid id, TextLibrary library) => Results.Ok(await library.GetAsync(id)));
        routes.MapPost("", async (TextDraft draft, HttpContext c, TextLibrary library) =>
        {
            var item = await library.CreateAsync(draft, HttpIdentity.UserId(c)); return Results.Created($"/api/v1/content/{item.Id}", item);
        });
        routes.MapPost("/{id:guid}", async (Guid id, EditText draft, HttpContext c, TextLibrary library) =>
            Results.Ok(await library.UpdateAsync(id, draft.Version, draft, null, HttpIdentity.UserId(c))));
        routes.MapPost("/{id:guid}/archive", async (Guid id, ContentVersion request, HttpContext c, TextLibrary library) =>
            Results.Ok(await library.UpdateAsync(id, request.Version, null, true, HttpIdentity.UserId(c))));
        routes.MapPost("/{id:guid}/restore", async (Guid id, ContentVersion request, HttpContext c, TextLibrary library) =>
            Results.Ok(await library.UpdateAsync(id, request.Version, null, false, HttpIdentity.UserId(c))));
    }
}
