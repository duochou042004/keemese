using Keemese.Api.Identity;
using Keemese.Api.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Keemese.Api.Content;

public sealed class TextContent
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid AuthorId { get; set; }
    public string AuthorRole { get; set; } = "Tutor";
    public string Title { get; set; } = "";
    public string Description { get; set; } = "";
    public string Body { get; set; } = "";
    public bool Archived { get; set; }
    public long Version { get; set; } = 1;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
public sealed record TextDraft(string? Title, string? Description, string? Body);
public sealed record EditText(string? Title, string? Description, string? Body, long Version);
public sealed record ContentVersion(long Version);
public sealed record TextSummary(Guid Id, string Title, string Description, bool Archived, long Version, DateTimeOffset CreatedAt, DateTimeOffset UpdatedAt);
public sealed record TextDetail(Guid Id, string Title, string Description, string Body, bool Archived, long Version, DateTimeOffset CreatedAt, DateTimeOffset UpdatedAt);

public sealed class TextLibrary(WorkspaceDb db, IdentityService identity, TimeProvider time)
{
    private static (string Title, string Description, string Body) Validate(string? title, string? description, string? body)
    {
        title = title?.Trim(); description ??= ""; body ??= "";
        if (string.IsNullOrEmpty(title) || title.Length > 200 || title.Contains('\0')) throw new ApiFault(400, "invalid_content_title");
        if (description.Length > 2000 || body.Length > 50000 || description.Contains('\0') || body.Contains('\0')) throw new ApiFault(400, "invalid_content_text");
        return (title, description, body);
    }
    private static TextDetail Detail(TextContent x) => new(x.Id, x.Title, x.Description, x.Body, x.Archived, x.Version, x.CreatedAt, x.UpdatedAt);
    public async Task<TextDetail> CreateAsync(TextDraft draft, Guid actor)
    {
        var (title, description, body) = Validate(draft.Title, draft.Description, draft.Body);
        var item = new TextContent { AuthorId = actor, Title = title, Description = description, Body = body, CreatedAt = time.GetUtcNow(), UpdatedAt = time.GetUtcNow() };
        db.TextContents.Add(item); identity.Audit("content_create", item.Id, actor);
        await db.SaveChangesAsync(); // Content and audit share EF's atomic SaveChanges transaction.
        return Detail(item);
    }
    public async Task<TextDetail> GetAsync(Guid id) => Detail(await db.TextContents.AsNoTracking().SingleOrDefaultAsync(x => x.Id == id)
        ?? throw new ApiFault(404, "content_missing"));
    public async Task<List<TextSummary>> ListAsync(bool archived, int page, int size) => await db.TextContents.AsNoTracking()
        .Where(x => x.Archived == archived).OrderByDescending(x => x.UpdatedAt).ThenBy(x => x.Id)
        .Skip((page - 1) * size).Take(size + 1)
        .Select(x => new TextSummary(x.Id, x.Title, x.Description, x.Archived, x.Version, x.CreatedAt, x.UpdatedAt)).ToListAsync();
    public async Task<TextDetail> UpdateAsync(Guid id, long version, EditText? draft, bool? archived, Guid actor)
    {
        var item = await db.TextContents.SingleOrDefaultAsync(x => x.Id == id) ?? throw new ApiFault(404, "content_missing");
        if (version != item.Version) throw new ApiFault(409, "content_stale");
        if (draft is not null)
        {
            if (item.Archived) throw new ApiFault(409, "content_archived");
            (item.Title, item.Description, item.Body) = Validate(draft.Title, draft.Description, draft.Body);
        }
        else
        {
            if (item.Archived == archived) return Detail(item); // Current-version retry has no duplicate audit.
            item.Archived = archived!.Value;
        }
        item.Version++; item.UpdatedAt = time.GetUtcNow();
        identity.Audit(draft is not null ? "content_edit" : archived == true ? "content_archive" : "content_restore", item.Id, actor);
        try { await db.SaveChangesAsync(); }
        catch (DbUpdateConcurrencyException) { throw new ApiFault(409, "content_stale"); }
        return Detail(item);
    }
}

public static class ContentRoutes
{
    public static void MapTextLibrary(this WebApplication app)
    {
        var routes = app.MapGroup("/api/v1/content");
        routes.MapGet("", async (HttpContext c, TextLibrary library) =>
        {
            if (c.Request.Query.Keys.Any(x => x is not ("page" or "pageSize" or "archived"))) throw new ApiFault(400, "invalid_pagination");
            static int Number(string? value, int fallback, int max) => value is null ? fallback : int.TryParse(value, out var n) && n >= 1 && n <= max ? n : throw new ApiFault(400, "invalid_pagination");
            var page = Number(c.Request.Query["page"], 1, 1000000); var size = Number(c.Request.Query["pageSize"], 25, 100);
            var filter = c.Request.Query["archived"].ToString();
            if (filter is not ("" or "true" or "false")) throw new ApiFault(400, "invalid_pagination");
            var rows = await library.ListAsync(filter == "true", page, size);
            return Results.Ok(new { items = rows.Take(size), nextPage = rows.Count > size ? (int?)(page + 1) : null });
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
