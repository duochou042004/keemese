using System.Net;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Keemese.Api.Tests;

public sealed class LivenessTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient client;

    public LivenessTests(WebApplicationFactory<Program> factory)
    {
        client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false,
            BaseAddress = new Uri("https://localhost")
        });
    }

    [Fact]
    public async Task Liveness_returns_only_the_public_status_contract()
    {
        using var response = await client.GetAsync("/api/v1/health/live");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("application/json", response.Content.Headers.ContentType?.MediaType);
        using var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Single(body.RootElement.EnumerateObject());
        Assert.Equal("ok", body.RootElement.GetProperty("status").GetString());
    }

    [Theory]
    [InlineData("GET", "/api/v1/content", HttpStatusCode.Unauthorized)]
    [InlineData("POST", "/api/v1/health/live", HttpStatusCode.MethodNotAllowed)]
    public async Task Host_does_not_expose_unimplemented_routes_or_mutations(
        string method, string path, HttpStatusCode expected)
    {
        using var request = new HttpRequestMessage(new HttpMethod(method), path);
        using var response = await client.SendAsync(request);
        Assert.Equal(expected, response.StatusCode);
    }
}
