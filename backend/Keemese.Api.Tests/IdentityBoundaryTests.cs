using System.Diagnostics;
using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Keemese.Api.Identity;
using Keemese.Api.Persistence;
using Keemese.Database.Tests;
using Microsoft.EntityFrameworkCore;
using Xunit;
using static Keemese.Api.Tests.IdentityCases;

namespace Keemese.Api.Tests;

public sealed class IdentityBoundaryTests
{
    [Fact]
    public Task Concurrent_first_bootstrap_has_one_winner_and_recovery_requires_existing_tutor() => new DisposablePostgres().RunAsync(async cs =>
    {
        await using var app = new TestApplicationFactory(cs);
        await app.InScope(async (db, service) =>
        {
            await db.Database.EnsureCreatedAsync();
            var missing = await Assert.ThrowsAsync<ApiFault>(() => service.RecoverAsync(Reset, true)); Assert.Equal(404, missing.Status); return 0;
        });
        var statuses = await Task.WhenAll(Enumerable.Range(0, 2).Select(async i =>
        {
            try { await app.InScope(async (_, service) => await service.BootstrapAsync("tutor" + i, TutorPassword)); return 201; }
            catch (ApiFault e) { return e.Status; }
        }));
        Assert.Equal(new[] { 201, 409 }, statuses.Order().ToArray());
        await app.InScope(async (db, _) =>
        {
            Assert.Equal(1, await db.Users.CountAsync()); Assert.Equal(1, await db.Audit.CountAsync()); return 0;
        });
    });

    [Fact]
    public Task Production_requires_https_and_development_exception_requires_both_loopbacks() => new DisposablePostgres().RunAsync(async cs =>
    {
        await using var production = new TestApplicationFactory(cs); await production.Seed();
        using var http = production.Client(https: false);
        await http.AssertStatus("/api/v1/auth/csrf", HttpStatusCode.BadRequest);
        await using var local = new TestApplicationFactory(cs, "Development");
        using var loopback = local.Client(https: false); var csrf = await loopback.GetAsync("/api/v1/auth/csrf"); Assert.Equal(HttpStatusCode.OK, csrf.StatusCode);
        Assert.DoesNotContain("; secure", string.Join(';', csrf.Headers.GetValues("Set-Cookie")));
        var login = await loopback.Login(); Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        var cookie = login.Headers.GetValues("Set-Cookie").Single(x => x.StartsWith(HttpIdentity.CookieName + "=", StringComparison.Ordinal));
        Assert.DoesNotContain("; secure", cookie); Assert.Contains("httponly", cookie); Assert.Contains("samesite=lax", cookie);
        using var wrongHost = local.Client(https: false, host: "example.test"); await wrongHost.AssertStatus("/api/v1/auth/csrf", HttpStatusCode.BadRequest);
        await using var remote = new TestApplicationFactory(cs, "Development", loopback: false);
        using var remoteClient = remote.Client(https: false); await remoteClient.AssertStatus("/api/v1/auth/csrf", HttpStatusCode.BadRequest);
        Assert.DoesNotContain(production.Logs.Lines.Concat(local.Logs.Lines).Concat(remote.Logs.Lines), line => line.Contains("Writing data to file", StringComparison.Ordinal));
    });

    [Fact]
    public Task Malformed_and_unexpected_json_errors_are_safe_problem_details() => TestApplicationFactory.WithDatabase(async app =>
    {
        using var client = app.Client();
        foreach (var payload in new object[] { new { username = "tutor", password = TutorPassword, role = "Tutor" }, new { username = 123, password = TutorPassword }, new { username = "tutor" } })
        {
            var response = await client.Post("/api/v1/auth/login", payload);
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
            Assert.Equal("application/problem+json", response.Content.Headers.ContentType!.MediaType);
            Assert.DoesNotContain(TutorPassword, await response.Content.ReadAsStringAsync());
        }
        await app.InScope(async (db, _) =>
        {
            db.Users.Add(new Account { Id = Guid.NewGuid(), UserName = "unprovisioned", NormalizedUserName = "UNPROVISIONED" });
            await db.SaveChangesAsync(); return 0;
        });
        // Timing-work fallback must never supply credentials to a hashless account.
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.Login("unprovisioned", "dummy password only")).StatusCode);
        await client.Login();
        var errors = new List<HttpResponseMessage>
        {
            await client.Post("/api/v1/students", new { username = "invalid", displayName = "Name", temporaryPassword = Temporary, role = "Tutor" }),
            await client.Post($"/api/v1/students/{Guid.NewGuid()}/credentials/reset", new { version = 1, temporaryPassword = Reset }),
            await client.Post($"/api/v1/students/{Guid.NewGuid()}/deactivate", new { version = 1 })
        };
        foreach (var response in errors)
        {
            Assert.True((int)response.StatusCode >= 400); Assert.Equal("application/problem+json", response.Content.Headers.ContentType!.MediaType);
            var body = await response.Content.ReadFromJsonAsync<JsonElement>(); Assert.True(body.TryGetProperty("code", out _)); Assert.True(body.TryGetProperty("traceId", out _));
            Assert.DoesNotContain("Exception", body.GetRawText());
        }
    });

    [Fact]
    public Task Operator_terminal_modes_hide_passwords_and_do_not_serve_http() => new DisposablePostgres().RunAsync(async cs =>
    {
        await using var app = new TestApplicationFactory(cs);
        await app.InScope(async (db, _) => { await db.Database.EnsureCreatedAsync(); return 0; });
        var bootstrap = await Terminal(cs, "identity-bootstrap", [("Username: ", "operator"), ("Password: ", TutorPassword)]);
        Assert.Equal(0, bootstrap.Exit); Assert.Contains("Completed.", bootstrap.Output); Assert.DoesNotContain(TutorPassword, bootstrap.Output);
        Assert.DoesNotContain("Now listening", bootstrap.Output);
        var repeat = await Terminal(cs, "identity-bootstrap", [("Username: ", "operator"), ("Password: ", Reset)]);
        Assert.NotEqual(0, repeat.Exit); Assert.Contains("tutor_exists", repeat.Output); Assert.DoesNotContain(Reset, repeat.Output);
        var cancelled = await Terminal(cs, "identity-recover", [("Type RECOVER", "CANCEL")]);
        Assert.NotEqual(0, cancelled.Exit); Assert.Contains("recovery_confirmation_required", cancelled.Output);
        using var one = app.Client(); using var login = await one.Login("operator"); using var replay = app.Replay(await Cookie(login));
        using var two = app.Client(); await two.Login("operator");
        var recovered = await Terminal(cs, "identity-recover", [("Type RECOVER", "RECOVER"), ("New password: ", Reset)]);
        Assert.Equal(0, recovered.Exit); Assert.DoesNotContain(Reset, recovered.Output);
        foreach (var c in new[] { one, two, replay }) await c.AssertStatus("/api/v1/auth/me", HttpStatusCode.Unauthorized);
        Assert.Equal(HttpStatusCode.Unauthorized, (await one.Login("operator")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await one.Login("operator", Reset)).StatusCode);
        await app.InScope(async (db, _) => { Assert.Equal(1, await db.Users.CountAsync()); Assert.Equal(1, await db.Audit.CountAsync(x => x.Action == "tutor_recovery")); return 0; });
    });

    // Linux pilot PTY via existing util-linux script, with terminal input echo disabled.
    // Connection string is process-local environment only; neither credentials nor output are printed.
    private static async Task<(int Exit, string Output)> Terminal(string cs, string mode, (string Prompt, string Answer)[] interactions)
    {
        var assembly = typeof(Program).Assembly.Location.Replace("'", "'\\''", StringComparison.Ordinal);
        using var process = new Process { StartInfo = new ProcessStartInfo("script")
        {
            RedirectStandardInput = true, RedirectStandardOutput = true, RedirectStandardError = true, UseShellExecute = false
        } };
        foreach (var arg in new[] { "-q", "-e", "-E", "never", "-c", $"dotnet '{assembly}' {mode}", "/dev/null" }) process.StartInfo.ArgumentList.Add(arg);
        process.StartInfo.Environment["ConnectionStrings__Workspace"] = cs;
        process.StartInfo.Environment["ASPNETCORE_ENVIRONMENT"] = "Production";
        process.StartInfo.Environment["Logging__LogLevel__Default"] = "None";
        process.Start(); var stderr = process.StandardError.ReadToEndAsync();
        var output = new StringBuilder(); var step = 0;
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(30));
        try
        {
            var buffer = new char[1];
            while (await process.StandardOutput.ReadAsync(buffer.AsMemory(), timeout.Token) > 0)
            {
                output.Append(buffer[0]);
                if (step < interactions.Length && output.ToString().Contains(interactions[step].Prompt, StringComparison.Ordinal))
                {
                    await process.StandardInput.WriteLineAsync(interactions[step].Answer); await process.StandardInput.FlushAsync(); step++;
                }
            }
            await process.WaitForExitAsync(timeout.Token); await stderr;
            return (process.ExitCode, output.ToString());
        }
        finally
        {
            if (!process.HasExited) { process.Kill(entireProcessTree: true); await process.WaitForExitAsync(); }
        }
    }
}
