using Keemese.Api.Content;
using Keemese.Api.Identity;

var operatorMode = args.Length > 0 && args[0].StartsWith("identity-", StringComparison.Ordinal);
var builder = WebApplication.CreateBuilder(operatorMode ? [] : args);
builder.AddWorkspaceIdentity();
var app = builder.Build();
if (operatorMode)
{
    await using var scope = app.Services.CreateAsyncScope();
    Environment.ExitCode = await OperatorCommand.RunAsync(args, scope.ServiceProvider.GetRequiredService<IdentityService>());
    return;
}
app.UseWorkspaceIdentity();
// Process liveness remains anonymous and DB-independent, including during outages.
app.MapGet("/api/v1/health/live", () => Results.Ok(new { status = "ok" }));
app.MapWorkspaceIdentity();
app.MapTextLibrary();
app.Run();
public partial class Program { }
