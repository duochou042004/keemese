using System.Collections.Concurrent;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Keemese.Api.Identity;
using Keemese.Api.Persistence;
using Keemese.Database.Tests;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Xunit;

namespace Keemese.Api.Tests;

public sealed class TestClock : TimeProvider
{
    private DateTimeOffset now = new(2026, 10, 28, 0, 0, 0, TimeSpan.Zero);
    public override DateTimeOffset GetUtcNow() => now;
    public void Advance(TimeSpan duration) => now += duration;
}

public sealed class ProfileFailure : SaveChangesInterceptor
{
    public bool Enabled { get; set; }
    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(DbContextEventData data, InterceptionResult<int> result, CancellationToken cancellationToken = default)
    {
        if (Enabled && data.Context!.ChangeTracker.Entries<StudentProfile>().Any(x => x.State == EntityState.Added))
            throw new InvalidOperationException("Synthetic profile insert failure");
        return base.SavingChangesAsync(data, result, cancellationToken);
    }
}

public sealed class CapturedLogs : ILoggerProvider
{
    public ConcurrentQueue<string> Lines { get; } = new();
    public ILogger CreateLogger(string categoryName) => new Capture(Lines);
    public void Dispose() { }
    private sealed class Capture(ConcurrentQueue<string> lines) : ILogger
    {
        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;
        public bool IsEnabled(LogLevel logLevel) => true;
        public void Log<TState>(LogLevel level, EventId id, TState state, Exception? exception, Func<TState, Exception?, string> formatter)
            => lines.Enqueue(formatter(state, exception) + (exception is null ? "" : "\n" + exception));
    }
}

public sealed class TestApplicationFactory(string connection, string environment = "Production", bool loopback = true) : WebApplicationFactory<Program>
{
    public TestClock Clock { get; } = new();
    public ProfileFailure Failure { get; } = new();
    public CapturedLogs Logs { get; } = new();
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment(environment);
        builder.ConfigureLogging(l => { l.ClearProviders(); l.AddProvider(Logs); });
        builder.ConfigureServices(s =>
        {
            s.AddSingleton<TimeProvider>(Clock);
            s.AddDbContext<WorkspaceDb>(o => o.UseNpgsql(connection).AddInterceptors(Failure));
            s.AddSingleton<Microsoft.AspNetCore.Hosting.IStartupFilter>(new RemoteFilter(loopback));
        });
    }
    private sealed class RemoteFilter(bool loopback) : IStartupFilter
    {
        public Action<Microsoft.AspNetCore.Builder.IApplicationBuilder> Configure(Action<Microsoft.AspNetCore.Builder.IApplicationBuilder> next) => app =>
        {
            app.Use(async (c, continuation) =>
            {
                c.Connection.RemoteIpAddress = IPAddress.Parse(loopback ? "127.0.0.1" : "192.0.2.1");
                await continuation(c);
            });
            next(app);
        };
    }
    public HttpClient Client(bool https = true, string host = "localhost") => CreateClient(new()
        { BaseAddress = new Uri($"{(https ? "https" : "http")}://{host}"), AllowAutoRedirect = false });
    public async Task<T> InScope<T>(Func<WorkspaceDb, IdentityService, Task<T>> action)
    {
        await using var scope = Services.CreateAsyncScope();
        return await action(scope.ServiceProvider.GetRequiredService<WorkspaceDb>(), scope.ServiceProvider.GetRequiredService<IdentityService>());
    }
    public async Task Seed() => await InScope(async (db, service) =>
    {
        await db.Database.EnsureCreatedAsync();
        return await service.BootstrapAsync("tutor", IdentityCases.TutorPassword);
    });
    public static Task WithDatabase(Func<TestApplicationFactory, Task> test) => new DisposablePostgres().RunAsync(async cs =>
    {
        await using var app = new TestApplicationFactory(cs);
        await app.Seed(); await test(app);
    });
}

public static class IdentityCases
{
    public const string TutorPassword = "Tutor mật khẩu 123";
    public const string Temporary = "Student tạm thời 456";
    public const string Changed = "Student mới mật khẩu 789";
    public const string Reset = "Student reset mật khẩu 012";
    public static async Task<HttpResponseMessage> Post(this HttpClient client, string path, object body, bool csrf = true, string? origin = null, string? token = null)
    {
        if (csrf && token is null)
        {
            using var response = await client.GetAsync("/api/v1/auth/csrf");
            response.EnsureSuccessStatusCode(); token = (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("token").GetString();
        }
        using var request = new HttpRequestMessage(HttpMethod.Post, path) { Content = JsonContent.Create(body) };
        request.Headers.Add("Origin", origin ?? client.BaseAddress!.GetLeftPart(UriPartial.Authority));
        if (csrf) request.Headers.Add("X-CSRF-TOKEN", token);
        return await client.SendAsync(request);
    }
    public static Task<HttpResponseMessage> Login(this HttpClient client, string username = "tutor", string password = TutorPassword)
        => client.Post("/api/v1/auth/login", new { username, password });
    public static async Task<JsonElement> Create(this HttpClient client, string username, string displayName)
    {
        using var response = await client.Post("/api/v1/students", new { username, displayName, temporaryPassword = Temporary });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return await response.Content.ReadFromJsonAsync<JsonElement>();
    }
    public static async Task<HttpClient> Student(this TestApplicationFactory app, HttpClient tutor, string username, bool rotate = true)
    {
        await tutor.Create(username, "Tên " + username);
        var client = app.Client(); Assert.Equal(HttpStatusCode.OK, (await client.Login(username, Temporary)).StatusCode);
        if (rotate)
        {
            Assert.Equal(HttpStatusCode.NoContent, (await client.Post("/api/v1/auth/password", new { currentPassword = Temporary, newPassword = Changed })).StatusCode);
            Assert.Equal(HttpStatusCode.OK, (await client.Login(username, Changed)).StatusCode);
        }
        return client;
    }
    public static async Task AssertStatus(this HttpClient client, string path, HttpStatusCode status)
    {
        using var response = await client.GetAsync(path); Assert.Equal(status, response.StatusCode);
        if ((int)status >= 400) Assert.Equal("application/problem+json", response.Content.Headers.ContentType!.MediaType);
    }
    public static async Task<string> Cookie(HttpResponseMessage response)
    {
        await response.Content.ReadAsStringAsync();
        return response.Headers.GetValues("Set-Cookie").Single(x => x.StartsWith(HttpIdentity.CookieName + "=", StringComparison.Ordinal)).Split(';')[0];
    }
    public static HttpClient Replay(this TestApplicationFactory app, string cookie)
    {
        var client = app.Client(); client.DefaultRequestHeaders.Add("Cookie", cookie); return client;
    }
}
