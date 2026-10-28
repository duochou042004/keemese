using System.Diagnostics;
using Npgsql;

namespace Keemese.Database.Tests;

// No external connection string is accepted: this helper can only target its own container.
internal sealed class DisposablePostgres
{
    internal const string Image = "docker.io/library/postgres:18.6-alpine@sha256:10a5c69a83035ab5239f5620d708520e8b28f5aa1f2b20143e6024532edadfb5";
    private readonly string name = $"keemese-f0b-{Guid.NewGuid():N}";
    private const string OwnerLabel = "io.keemese.test-owner";

    internal async Task RunAsync(Func<string, Task> test)
    {
        var rootless = await PodmanAsync("info", "--format", "{{.Host.Security.Rootless}}");
        if (rootless.Trim() != "true")
            throw new InvalidOperationException("F0b requires rootless Podman.");

        var password = Guid.NewGuid().ToString("N");
        try
        {
            // tmpfs overrides the image's volume: no named/anonymous volume or host bind mount.
            await PodmanAsync("create", "--pull=never", "--name", name,
                "--label", $"{OwnerLabel}={name}", "--publish", "127.0.0.1::5432",
                "--tmpfs", "/var/lib/postgresql:rw,size=256m",
                "--env", "POSTGRES_DB=f0b", "--env", "POSTGRES_USER=f0b",
                "--env", $"POSTGRES_PASSWORD={password}", Image);
            await PodmanAsync("start", name);
            var mapping = (await PodmanAsync("port", name, "5432/tcp")).Trim();
            if (!mapping.StartsWith("127.0.0.1:", StringComparison.Ordinal))
                throw new InvalidOperationException("Expected only a loopback port binding.");
            var connectionString = new NpgsqlConnectionStringBuilder
            {
                Host = "127.0.0.1", Port = int.Parse(mapping.Split(':')[1]),
                Database = "f0b", Username = "f0b", Password = password,
                Pooling = false, Timeout = 2, CommandTimeout = 10
            }.ConnectionString;
            await WaitUntilReadyAsync(connectionString);
            await test(connectionString);
        }
        finally
        {
            // A failed create/start/test still attempts cleanup; never remove by a broad filter.
            var exists = await ExecuteAsync("container", "exists", name);
            if (exists.ExitCode == 0)
            {
                var owner = (await PodmanAsync("inspect", "--format",
                    $"{{{{ index .Config.Labels \"{OwnerLabel}\" }}}}", name)).Trim();
                if (owner != name)
                    throw new InvalidOperationException($"Ownership mismatch; preserved {name}.");
                await PodmanAsync("rm", "--force", name);
                exists = await ExecuteAsync("container", "exists", name);
            }
            if (exists.ExitCode != 1)
                throw new InvalidOperationException($"Cleanup not verified for {name}: {exists.Error}");
        }
    }

    private static async Task WaitUntilReadyAsync(string connectionString)
    {
        using var deadline = new CancellationTokenSource(TimeSpan.FromSeconds(45));
        while (true)
        {
            try
            {
                await using var connection = new NpgsqlConnection(connectionString);
                await connection.OpenAsync(deadline.Token);
                await using var command = new NpgsqlCommand("SELECT 1", connection);
                await command.ExecuteScalarAsync(deadline.Token);
                return;
            }
            catch (NpgsqlException) when (!deadline.IsCancellationRequested)
            {
                await Task.Delay(200, deadline.Token);
            }
        }
    }

    private static async Task<string> PodmanAsync(params string[] arguments)
    {
        var result = await ExecuteAsync(arguments);
        if (result.ExitCode != 0)
            throw new InvalidOperationException($"Podman {arguments[0]} failed ({result.ExitCode}): {result.Error}");
        return result.Output;
    }

    private static async Task<(int ExitCode, string Output, string Error)> ExecuteAsync(params string[] arguments)
    {
        using var process = new Process();
        process.StartInfo = new ProcessStartInfo("podman")
        {
            RedirectStandardOutput = true, RedirectStandardError = true, UseShellExecute = false
        };
        foreach (var argument in arguments) process.StartInfo.ArgumentList.Add(argument);
        process.Start();
        var output = process.StandardOutput.ReadToEndAsync();
        var error = process.StandardError.ReadToEndAsync();
        using var deadline = new CancellationTokenSource(TimeSpan.FromSeconds(60));
        try { await process.WaitForExitAsync(deadline.Token); }
        catch (OperationCanceledException)
        {
            process.Kill(entireProcessTree: true);
            await process.WaitForExitAsync();
            throw new TimeoutException($"Podman {arguments[0]} exceeded 60 seconds.");
        }
        return (process.ExitCode, await output, await error);
    }
}
