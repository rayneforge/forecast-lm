namespace Rayneforge.Forecast.Infrastructure.Data;

using Microsoft.EntityFrameworkCore;
using Rayneforge.Forecast.Domain.Models;
using System.Text.Json;

/// <summary>SQLite-backed context for the Conversation bounded context.</summary>
public class SqliteConversationDbContext : DbContext
{
    public SqliteConversationDbContext(DbContextOptions<SqliteConversationDbContext> options) : base(options) { }

    public DbSet<ConversationThread> Threads { get; set; }
    public DbSet<StoredMessage> Messages { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<ConversationThread>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.UserId).IsRequired();
        });

        modelBuilder.Entity<StoredMessage>(entity =>
        {
            entity.HasKey(e => e.MessageId);
            entity.Property(e => e.ThreadId).IsRequired();
            entity.HasIndex(e => e.ThreadId);

            // Store ContentParts as a JSON column
            entity.Property(e => e.ContentParts)
                  .HasConversion(
                      v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                      v => JsonSerializer.Deserialize<IReadOnlyList<StoredContentPart>>(v, (JsonSerializerOptions?)null)
                          ?? Array.Empty<StoredContentPart>()
                  );
        });
    }
}

/// <summary>Cosmos DB-backed context for the Conversation bounded context (database: ConversationDb).</summary>
public class CosmosConversationDbContext : DbContext
{
    public CosmosConversationDbContext(DbContextOptions<CosmosConversationDbContext> options) : base(options) { }

    public DbSet<ConversationThread> Threads { get; set; }
    public DbSet<StoredMessage> Messages { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<ConversationThread>(entity =>
        {
            entity.ToContainer("threads");
            entity.HasKey(e => e.Id);
            entity.HasPartitionKey(e => e.UserId);
        });

        modelBuilder.Entity<StoredMessage>(entity =>
        {
            entity.ToContainer("messages");
            entity.HasKey(e => e.MessageId);
            entity.HasPartitionKey(e => e.ThreadId);

            // Cosmos natively stores complex types as JSON — no conversion needed
            entity.Property(e => e.ContentParts)
                  .HasConversion(
                      v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                      v => JsonSerializer.Deserialize<IReadOnlyList<StoredContentPart>>(v, (JsonSerializerOptions?)null)
                          ?? Array.Empty<StoredContentPart>()
                  );
        });
    }
}
