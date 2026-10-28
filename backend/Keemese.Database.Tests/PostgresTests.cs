using Microsoft.EntityFrameworkCore;
using Npgsql;
using Xunit;

namespace Keemese.Database.Tests;

public sealed class PostgresTests
{
    [Fact]
    public async Task Committed_unicode_record_survives_a_new_connection()
    {
        await new DisposablePostgres().RunAsync(async connectionString =>
        {
            await using (var writer = new ProbeContext(connectionString))
            {
                await writer.Database.EnsureCreatedAsync();
                writer.Probes.Add(new Probe { Id = 1, Text = "Synthetic — Tiếng Việt 🎓" });
                await writer.SaveChangesAsync();
            }
            await using var reader = new ProbeContext(connectionString);
            var record = await reader.Probes.AsNoTracking().SingleAsync();
            Assert.Equal(1, record.Id);
            Assert.Equal("Synthetic — Tiếng Việt 🎓", record.Text);
            await using var connection = new NpgsqlConnection(connectionString);
            await connection.OpenAsync();
            await using var version = new NpgsqlCommand("SHOW server_version_num", connection);
            Assert.Equal("180006", await version.ExecuteScalarAsync());
        });
    }

    [Fact]
    public async Task Constraint_failure_rolls_back_earlier_write_and_preserves_committed_record()
    {
        await new DisposablePostgres().RunAsync(async connectionString =>
        {
            await using (var context = new ProbeContext(connectionString))
            {
                await context.Database.EnsureCreatedAsync();
                context.Probes.Add(new Probe { Id = 1, Text = "committed baseline" });
                await context.SaveChangesAsync();
                await using var transaction = await context.Database.BeginTransactionAsync();
                context.Probes.Add(new Probe { Id = 2, Text = "must roll back" });
                await context.SaveChangesAsync();
                Assert.Equal(2, await context.Probes.CountAsync());
                var error = await Assert.ThrowsAsync<PostgresException>(() =>
                    context.Database.ExecuteSqlRawAsync("INSERT INTO \"Probes\" (\"Id\", \"Text\") VALUES (1, 'duplicate')"));
                Assert.Equal(PostgresErrorCodes.UniqueViolation, error.SqlState);
                await transaction.RollbackAsync();
            }
            await using var reader = new ProbeContext(connectionString);
            var record = Assert.Single(await reader.Probes.AsNoTracking().ToListAsync());
            Assert.Equal(1, record.Id);
            Assert.Equal("committed baseline", record.Text);
        });
    }

    [Fact]
    public async Task Cleanup_is_verified_even_when_test_body_throws()
    {
        // RunAsync's finally also checks that the owned container no longer exists.
        await Assert.ThrowsAsync<ProbeFailure>(() => new DisposablePostgres().RunAsync(
            _ => throw new ProbeFailure()));
    }

    private sealed class ProbeFailure : Exception;

    private sealed class ProbeContext(string connectionString) : DbContext
    {
        public DbSet<Probe> Probes => Set<Probe>();
        protected override void OnConfiguring(DbContextOptionsBuilder options) =>
            options.UseNpgsql(connectionString);
        protected override void OnModelCreating(ModelBuilder modelBuilder) =>
            modelBuilder.Entity<Probe>().Property(p => p.Id).ValueGeneratedNever();
    }

    private sealed class Probe
    {
        public int Id { get; set; }
        public required string Text { get; set; }
    }
}
