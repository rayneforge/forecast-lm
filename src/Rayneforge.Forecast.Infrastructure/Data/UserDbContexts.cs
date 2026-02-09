namespace Rayneforge.Forecast.Infrastructure.Data;

using Microsoft.EntityFrameworkCore;
using Rayneforge.Forecast.Domain.Models;
using System.Text.Json;

/// <summary>SQLite-backed context for the User bounded context (conversations, workspaces).</summary>
public class SqliteUserDbContext : DbContext
{
    public SqliteUserDbContext(DbContextOptions<SqliteUserDbContext> options) : base(options) { }

    public DbSet<ConversationThread> Threads { get; set; }
    public DbSet<StoredMessage> Messages { get; set; }
    public DbSet<Workspace> Workspaces { get; set; }
    public DbSet<WorkspaceLink> WorkspaceLinks { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<ConversationThread>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.UserId).IsRequired();
            entity.HasIndex(e => e.WorkspaceId);
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

        modelBuilder.Entity<Workspace>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.UserId).IsRequired();
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.HasIndex(e => e.UserId);

            entity.HasMany(e => e.Links)
                  .WithOne()
                  .HasForeignKey(e => e.WorkspaceId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasMany(e => e.Threads)
                  .WithOne()
                  .HasForeignKey(e => e.WorkspaceId)
                  .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<WorkspaceLink>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.WorkspaceId).IsRequired();
            entity.Property(e => e.LinkedItemType)
                  .HasConversion<string>();
            // Unique constraint only for referenced items (Note/Topic have null LinkedItemId)
            entity.HasIndex(e => new { e.WorkspaceId, e.LinkedItemId, e.LinkedItemType });
        });
    }
}

/// <summary>Cosmos DB-backed context for the User bounded context (database: UserDb).</summary>
public class CosmosUserDbContext : DbContext
{
    public CosmosUserDbContext(DbContextOptions<CosmosUserDbContext> options) : base(options) { }

    public DbSet<ConversationThread> Threads { get; set; }
    public DbSet<StoredMessage> Messages { get; set; }
    public DbSet<Workspace> Workspaces { get; set; }
    public DbSet<WorkspaceLink> WorkspaceLinks { get; set; }

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

        modelBuilder.Entity<Workspace>(entity =>
        {
            entity.ToContainer("workspaces");
            entity.HasKey(e => e.Id);
            entity.HasPartitionKey(e => e.UserId);
            entity.Property(e => e.Name).IsRequired();
        });

        modelBuilder.Entity<WorkspaceLink>(entity =>
        {
            entity.ToContainer("workspace-links");
            entity.HasKey(e => e.Id);
            entity.HasPartitionKey(e => e.WorkspaceId);
            entity.Property(e => e.LinkedItemType)
                  .HasConversion<string>();
        });
    }
}
