using Keemese.Database.Tests;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Xunit;

namespace Keemese.Api.Tests;

// Explicit opt-in host, never mapped into production. Only helper-owned disposable data.
public sealed class UiHostFactAttribute : FactAttribute
{
    public UiHostFactAttribute()
    {
        if (Environment.GetEnvironmentVariable("KEEMESE_UI_TEST_HOST") != "1") Skip = "Opt-in disposable browser test host only.";
    }
}

public sealed class UiTestHost
{
    [UiHostFact]
    public async Task Serve_synthetic_workspace_until_explicit_test_stop()
    {
        var control = Environment.GetEnvironmentVariable("KEEMESE_UI_CONTROL");
        Assert.False(string.IsNullOrEmpty(control));
        var completion = Environment.GetEnvironmentVariable("KEEMESE_UI_COMPLETION");
        Assert.False(string.IsNullOrEmpty(completion));
        Assert.Equal($"ui-host-{control}.done", Path.GetFileName(completion));
        await new DisposablePostgres().RunAsync(async cs =>
        {
            await using var factory = new TestApplicationFactory(cs, "Development");
            await factory.Seed();
            using var client = factory.CreateClient(new() { HandleCookies = false, AllowAutoRedirect = false });
            var builder = WebApplication.CreateSlimBuilder();
            builder.WebHost.UseUrls("http://127.0.0.1:5080");
            await using var server = builder.Build();
            var stop = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
            server.MapPost("/__test/stop", (HttpContext c) =>
            {
                if (c.Request.Headers["X-Test-Control"] != control) return Results.NotFound();
                stop.TrySetResult(); return Results.NoContent();
            });
            server.MapPost("/__test/advance", (HttpContext c) =>
            {
                if (c.Request.Headers["X-Test-Control"] != control) return Results.NotFound();
                factory.Clock.Advance(TimeSpan.FromHours(9)); return Results.NoContent();
            });
            server.Map("/{**path}", async (HttpContext c) =>
            {
                using var request = new HttpRequestMessage(new HttpMethod(c.Request.Method),
                    $"http://{c.Request.Host}{c.Request.Path}{c.Request.QueryString}");
                if (c.Request.ContentLength > 0 || c.Request.Headers.ContainsKey("Transfer-Encoding")) request.Content = new StreamContent(c.Request.Body);
                foreach (var header in c.Request.Headers)
                {
                    if (!request.Headers.TryAddWithoutValidation(header.Key, header.Value.ToArray()))
                        request.Content?.Headers.TryAddWithoutValidation(header.Key, header.Value.ToArray());
                }
                using var response = await client.SendAsync(request, c.RequestAborted);
                c.Response.StatusCode = (int)response.StatusCode;
                foreach (var header in response.Headers.Concat(response.Content.Headers)) c.Response.Headers[header.Key] = header.Value.ToArray();
                c.Response.Headers.Remove("Transfer-Encoding");
                await response.Content.CopyToAsync(c.Response.Body, c.RequestAborted);
            });
            await server.StartAsync();
            try
            {
                // Even interrupted browser runs cannot hold the fixture forever.
                await stop.Task.WaitAsync(TimeSpan.FromMinutes(30));
            }
            finally { await server.StopAsync(); }
        });
        // Only acknowledge completion AFTER the helper has verified exact-container removal.
        await File.WriteAllTextAsync(completion!, "cleanup_verified");
    }
}
