using Keemese.Api.Content;
using System.Net;
using System.Security.Claims;
using System.Text.Json;
using System.Xml.Linq;
using Microsoft.AspNetCore.DataProtection.Repositories;
using System.Text.Json.Serialization;
using Keemese.Api.Persistence;
using Keemese.Api.Students;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Keemese.Api.Identity;

public sealed record LoginRequest(string? Username, string? Password);
public sealed record PasswordRequest(string? CurrentPassword, string? NewPassword);

// Rolling 60-second window; in-memory, single-process local pilot only.
public sealed class LoginThrottle(TimeProvider time)
{
    private readonly object gate = new();
    private readonly Dictionary<string, Queue<DateTimeOffset>> attempts = new();
    public bool Allow(string ip)
    {
        lock (gate)
        {
            var cutoff = time.GetUtcNow().AddMinutes(-1);
            foreach (var key in attempts.Keys.ToArray())
            {
                var queue = attempts[key];
                while (queue.TryPeek(out var oldest) && oldest <= cutoff) queue.Dequeue();
                if (queue.Count == 0) attempts.Remove(key);
            }
            if (!attempts.TryGetValue(ip, out var current)) attempts[ip] = current = new();
            if (current.Count >= 10) return false;
            current.Enqueue(time.GetUtcNow()); return true;
        }
    }
}

public static class HttpIdentity
{
    public const string CookieName = "keemese.session";
    public static void AddWorkspaceIdentity(this WebApplicationBuilder builder)
    {
        builder.Services.AddSingleton(TimeProvider.System);
        builder.Services.AddSingleton<LoginThrottle>();
        builder.Services.AddScoped<IPasswordHasher<Account>, PasswordHasher<Account>>();
        builder.Services.AddScoped<IdentityService>(); builder.Services.AddScoped<StudentService>(); builder.Services.AddScoped<TextLibrary>();
        builder.Services.AddDbContext<WorkspaceDb>(o => o.UseNpgsql(builder.Configuration.GetConnectionString("Workspace")));
        // Local pilot deliberately writes no global key files. Restart invalidates all browser tickets.
        builder.Services.AddDataProtection().AddKeyManagementOptions(o => o.XmlRepository = new PilotKeyRepository())
            .UseEphemeralDataProtectionProvider();
        builder.Services.Configure<Microsoft.AspNetCore.Routing.RouteHandlerOptions>(o => o.ThrowOnBadRequest = true);
        builder.Services.ConfigureHttpJsonOptions(o =>
        {
            o.SerializerOptions.UnmappedMemberHandling = JsonUnmappedMemberHandling.Disallow;
            o.SerializerOptions.RespectRequiredConstructorParameters = true;
        });
        builder.Services.AddAntiforgery(o =>
        {
            o.HeaderName = "X-CSRF-TOKEN"; o.Cookie.Name = "keemese.csrf";
            o.Cookie.HttpOnly = true; o.Cookie.SameSite = SameSiteMode.Lax;
            o.Cookie.SecurePolicy = builder.Environment.IsDevelopment() ? CookieSecurePolicy.SameAsRequest : CookieSecurePolicy.Always;
        });
        builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme).AddCookie(o =>
        {
            o.Cookie.Name = CookieName; o.Cookie.HttpOnly = true; o.Cookie.SameSite = SameSiteMode.Lax;
            o.Cookie.SecurePolicy = builder.Environment.IsDevelopment() ? CookieSecurePolicy.SameAsRequest : CookieSecurePolicy.Always;
            o.ExpireTimeSpan = TimeSpan.FromHours(8); o.SlidingExpiration = false;
            o.Events.OnRedirectToLogin = c => WriteProblem(c.HttpContext, 401, "unauthenticated");
            o.Events.OnRedirectToAccessDenied = c => WriteProblem(c.HttpContext, 403, "forbidden");
            o.Events.OnValidatePrincipal = async c =>
            {
                if (c.Request.Path == "/api/v1/health/live") return;
                var db = c.HttpContext.RequestServices.GetRequiredService<WorkspaceDb>();
                var clock = c.HttpContext.RequestServices.GetRequiredService<TimeProvider>();
                if (!Guid.TryParse(c.Principal?.FindFirstValue("sid"), out var sid)) { c.RejectPrincipal(); return; }
                // Database failures propagate to outer safe error handler: no private bytes returned.
                var state = await (from s in db.Sessions.AsNoTracking() join u in db.Users.AsNoTracking() on s.UserId equals u.Id
                    where s.Id == sid && !s.Revoked && s.ExpiresAt > clock.GetUtcNow() && u.Active
                    select new { u.Id, u.Role, u.MustChangePassword }).SingleOrDefaultAsync();
                if (state is null) { c.RejectPrincipal(); return; }
                c.ReplacePrincipal(Principal(state.Id, state.Role, state.MustChangePassword, sid));
            };
        });
        builder.Services.AddOptions<CookieAuthenticationOptions>(CookieAuthenticationDefaults.AuthenticationScheme)
            .Configure<TimeProvider>((o, t) => o.TimeProvider = t);
    }

    private static ClaimsPrincipal Principal(Guid id, string role, bool mustChange, Guid sid) => new(new ClaimsIdentity(
        [new(ClaimTypes.NameIdentifier, id.ToString()), new(ClaimTypes.Role, role), new("change", mustChange ? "yes" : "no"), new("sid", sid.ToString())],
        CookieAuthenticationDefaults.AuthenticationScheme));
    public static Guid UserId(HttpContext c) => Guid.Parse(c.User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    private static bool Loopback(HttpContext c) =>
        (c.Request.Host.Host.Equals("localhost", StringComparison.OrdinalIgnoreCase) ||
         IPAddress.TryParse(c.Request.Host.Host, out var host) && IPAddress.IsLoopback(host)) &&
        c.Connection.RemoteIpAddress is { } remote && IPAddress.IsLoopback(remote);
    public static Task WriteProblem(HttpContext c, int status, string code) =>
        Results.Problem(statusCode: status, title: "Không thể hoàn tất yêu cầu.", extensions: new Dictionary<string, object?>
            { ["code"] = code, ["traceId"] = c.TraceIdentifier }).ExecuteAsync(c);

    public static void UseWorkspaceIdentity(this WebApplication app)
    {
        app.Use(async (c, next) =>
        {
            if (c.Request.Path == "/api/v1/health/live") { await next(c); return; }
            c.Response.Headers.CacheControl = "no-store";
            try
            {
                if (!c.Request.IsHttps && !(app.Environment.IsDevelopment() && Loopback(c)))
                    throw new ApiFault(400, "https_required");
                await next(c);
            }
            catch (ApiFault e) { await WriteProblem(c, e.Status, e.Code); }
            catch (AntiforgeryValidationException) { await WriteProblem(c, 400, "invalid_csrf"); }
            catch (BadHttpRequestException) { await WriteProblem(c, 400, "invalid_request"); }
            catch (JsonException) { await WriteProblem(c, 400, "invalid_request"); }
            catch (Exception) { await WriteProblem(c, 503, "service_unavailable"); }
        });
        app.UseStatusCodePages(status => WriteProblem(status.HttpContext, status.HttpContext.Response.StatusCode, "request_failed"));
        app.UseAuthentication();
        app.Use(async (c, next) =>
        {
            var path = (c.Request.Path.Value ?? "").ToLowerInvariant(); // Match ASP.NET route casing before access checks.
            if (!path.StartsWith("/api/v1/", StringComparison.Ordinal) || path == "/api/v1/health/live") { await next(c); return; }
            var anonymous = path is "/api/v1/auth/csrf" or "/api/v1/auth/login";
            if (!anonymous && c.User.Identity?.IsAuthenticated != true) throw new ApiFault(401, "unauthenticated");
            if (c.User.FindFirstValue("change") == "yes" && path is not ("/api/v1/auth/me" or "/api/v1/auth/password" or "/api/v1/auth/logout" or "/api/v1/auth/csrf"))
                throw new ApiFault(403, "password_change_required");
            if ((path.StartsWith("/api/v1/students", StringComparison.Ordinal) || c.Request.Path.StartsWithSegments("/api/v1/content")) && !c.User.IsInRole("Tutor")) throw new ApiFault(403, "forbidden");
            if (HttpMethods.IsPost(c.Request.Method))
            {
                var origin = c.Request.Headers.Origin.ToString();
                if (origin != $"{c.Request.Scheme}://{c.Request.Host}") throw new ApiFault(400, "invalid_origin");
                await c.RequestServices.GetRequiredService<IAntiforgery>().ValidateRequestAsync(c);
            }
            await next(c);
        });
    }

    private static void NoQuery(HttpContext c)
    {
        if (c.Request.Query.Count != 0 || c.Request.ContentLength > 0 || c.Request.Headers.ContainsKey("Transfer-Encoding"))
            throw new ApiFault(400, "unexpected_selector");
    }
    public static void MapWorkspaceIdentity(this WebApplication app)
    {
        app.MapGet("/api/v1/auth/csrf", (HttpContext c, IAntiforgery csrf) => Results.Ok(new { token = csrf.GetAndStoreTokens(c).RequestToken }));
        app.MapPost("/api/v1/auth/login", async (LoginRequest request, HttpContext c, IdentityService service, LoginThrottle throttle) =>
        {
            if (!throttle.Allow(c.Connection.RemoteIpAddress?.ToString() ?? "unknown"))
            {
                c.Response.Headers.RetryAfter = "60"; throw new ApiFault(429, "login_throttled");
            }
            var result = await service.LoginAsync(request.Username, request.Password) ?? throw new ApiFault(401, "invalid_credentials");
            await c.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme,
                Principal(result.Account.Id, result.Account.Role, result.Account.MustChangePassword, result.Session.Id),
                new AuthenticationProperties { IsPersistent = false, AllowRefresh = false, ExpiresUtc = result.Session.ExpiresAt });
            return Results.Ok(new { id = result.Account.Id, role = result.Account.Role, mustChangePassword = result.Account.MustChangePassword });
        });
        app.MapGet("/api/v1/auth/me", (HttpContext c) => Results.Ok(new
            { id = UserId(c), role = c.User.FindFirstValue(ClaimTypes.Role), mustChangePassword = c.User.FindFirstValue("change") == "yes" }));
        app.MapPost("/api/v1/auth/password", async (PasswordRequest request, HttpContext c, IdentityService service) =>
        {
            await service.ChangePasswordAsync(UserId(c), request.CurrentPassword, request.NewPassword);
            await c.SignOutAsync(); return Results.NoContent();
        });
        app.MapPost("/api/v1/auth/logout", async (HttpContext c, WorkspaceDb db, IdentityService service) =>
        {
            var sid = Guid.Parse(c.User.FindFirstValue("sid")!);
            await using var tx = await db.Database.BeginTransactionAsync(); await db.LockIdentityAsync();
            await db.Sessions.Where(x => x.Id == sid).ExecuteUpdateAsync(s => s.SetProperty(x => x.Revoked, true));
            service.Audit("logout", UserId(c), UserId(c)); await db.SaveChangesAsync(); await tx.CommitAsync();
            await c.SignOutAsync(); return Results.NoContent();
        });
        app.MapPost("/api/v1/students", async (CreateStudent request, HttpContext c, StudentService service) =>
        {
            var result = await service.CreateAsync(request, UserId(c)); return Results.Created($"/api/v1/students/{result.Id}", result);
        });
        app.MapGet("/api/v1/students", async (HttpContext c, StudentService service) =>
        {
            if (c.Request.Query.Keys.Any(x => x is not ("page" or "pageSize"))) throw new ApiFault(400, "invalid_pagination");
            var page = ParsePage(c.Request.Query["page"], 1, 1_000_000);
            var size = ParsePage(c.Request.Query["pageSize"], 25, 100);
            var rows = await service.ListAsync(page, size);
            return Results.Ok(new { items = rows.Take(size), nextPage = rows.Count > size ? (int?)(page + 1) : null });
        });
        app.MapGet("/api/v1/students/{id:guid}", async (Guid id, StudentService service) =>
            await service.GetAsync(id) is { } result ? Results.Ok(result) : throw new ApiFault(404, "student_missing"));
        app.MapPost("/api/v1/students/{id:guid}/credentials/reset", async (Guid id, ResetStudent request, HttpContext c, StudentService service) =>
            Results.Ok(await service.UpdateAsync(id, request.Version, request.TemporaryPassword, false, UserId(c))));
        app.MapPost("/api/v1/students/{id:guid}/deactivate", async (Guid id, DeactivateStudent request, HttpContext c, StudentService service) =>
            Results.Ok(await service.UpdateAsync(id, request.Version, null, true, UserId(c))));
        app.MapGet("/api/v1/me/profile", async (HttpContext c, WorkspaceDb db) =>
        {
            if (!c.User.IsInRole("Student")) throw new ApiFault(403, "forbidden");
            NoQuery(c); var id = UserId(c);
            return Results.Ok(await (from p in db.Students.AsNoTracking() join u in db.Users.AsNoTracking() on p.UserId equals u.Id
                where u.Id == id select new OwnProfile(p.Id, p.DisplayName, u.UserName!)).SingleAsync());
        });
    }
    private static int ParsePage(string? value, int fallback, int max) =>
        string.IsNullOrEmpty(value) ? fallback : int.TryParse(value, out var number) && number > 0 && number <= max ? number : throw new ApiFault(400, "invalid_pagination");
}

// The framework key-management warmup service can run even with an ephemeral provider.
// Keep its repository in memory too, so warmup never touches the user profile.
internal sealed class PilotKeyRepository : IXmlRepository
{
    private readonly List<XElement> elements = new();
    public IReadOnlyCollection<XElement> GetAllElements() { lock (elements) return elements.Select(x => new XElement(x)).ToArray(); }
    public void StoreElement(XElement element, string friendlyName) { lock (elements) elements.Add(new XElement(element)); }
}
