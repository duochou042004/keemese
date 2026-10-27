var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

// Process liveness only: this does not assert database readiness or authorization.
app.MapGet("/api/v1/health/live", () => Results.Ok(new { status = "ok" }));

app.Run();

// Expose the actual entry point to WebApplicationFactory integration tests.
public partial class Program { }
