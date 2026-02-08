namespace Rayneforge.Forecast.Infrastructure.Data;

using Microsoft.EntityFrameworkCore;
using Rayneforge.Forecast.Domain.Abstractions;
using Rayneforge.Forecast.Domain.Models;
using System.Text.Json;

/// <summary>SQLite-backed context for the News bounded context.</summary>
public class SqliteNewsDbContext : DbContext
{
    public SqliteNewsDbContext(DbContextOptions<SqliteNewsDbContext> options) : base(options) { }

    public DbSet<NewsArticle> NewsArticles { get; set; }
    public DbSet<Entity> Entities { get; set; }
    public DbSet<ArticleClaim> ArticleClaims { get; set; }
    public DbSet<Narrative> Narratives { get; set; }
    public DbSet<ArticleClaimEntity> ArticleClaimEntities { get; set; }
    public DbSet<NarrativeClaimLink> NarrativeClaimLinks { get; set; }
    public DbSet<NarrativeEntityLink> NarrativeEntityLinks { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        ConfigureEmbeddingAsSqliteJson<NewsArticle>(modelBuilder);
        ConfigureEmbeddingAsSqliteJson<Entity>(modelBuilder);
        ConfigureEmbeddingAsSqliteJson<ArticleClaim>(modelBuilder);
        ConfigureEmbeddingAsSqliteJson<Narrative>(modelBuilder);

        // ── NewsArticle ──
        modelBuilder.Entity<NewsArticle>(cfg =>
        {
            cfg.HasKey(e => e.Id);
            cfg.OwnsOne(e => e.Source);
            cfg.HasMany(e => e.Claims)
               .WithOne(c => c.Article)
               .HasForeignKey(c => c.ArticleId)
               .OnDelete(DeleteBehavior.Cascade);
        });

        // ── Entity (deduplicated) ──
        modelBuilder.Entity<Entity>(cfg =>
        {
            cfg.HasKey(e => e.Id);
            cfg.HasIndex(e => new { e.EntityType, e.CanonicalName }).IsUnique();
        });

        // ── ArticleClaim ──
        modelBuilder.Entity<ArticleClaim>(cfg =>
        {
            cfg.HasKey(e => e.Id);
            cfg.HasIndex(e => e.ArticleId);
        });

        // ── Narrative ──
        modelBuilder.Entity<Narrative>(cfg =>
        {
            cfg.HasKey(e => e.Id);
            cfg.HasIndex(e => e.Category);
        });

        // ── Join: Claim ↔ Entity ──
        modelBuilder.Entity<ArticleClaimEntity>(cfg =>
        {
            cfg.HasKey(e => new { e.ClaimId, e.EntityId });
            cfg.HasOne(e => e.Claim).WithMany(c => c.EntityLinks).HasForeignKey(e => e.ClaimId);
            cfg.HasOne(e => e.Entity).WithMany().HasForeignKey(e => e.EntityId);
        });

        // ── Join: Narrative ↔ Claim ──
        modelBuilder.Entity<NarrativeClaimLink>(cfg =>
        {
            cfg.HasKey(e => new { e.NarrativeId, e.ClaimId });
            cfg.HasOne(e => e.Narrative).WithMany(n => n.ClaimLinks).HasForeignKey(e => e.NarrativeId);
            cfg.HasOne(e => e.Claim).WithMany(c => c.NarrativeLinks).HasForeignKey(e => e.ClaimId);
        });

        // ── Join: Narrative ↔ Entity ──
        modelBuilder.Entity<NarrativeEntityLink>(cfg =>
        {
            cfg.HasKey(e => new { e.NarrativeId, e.EntityId });
            cfg.HasOne(e => e.Narrative).WithMany(n => n.EntityLinks).HasForeignKey(e => e.NarrativeId);
            cfg.HasOne(e => e.Entity).WithMany().HasForeignKey(e => e.EntityId);
        });
    }

    /// <summary>Shared helper: store Embedding as JSON string in SQLite.</summary>
    private static void ConfigureEmbeddingAsSqliteJson<T>(ModelBuilder modelBuilder) where T : class, ISemanticEntity
    {
        modelBuilder.Entity<T>()
            .Property(e => e.Embedding)
            .HasConversion(
                v => JsonSerializer.Serialize(v.ToArray(), (JsonSerializerOptions?)null),
                v => new ReadOnlyMemory<float>(
                    JsonSerializer.Deserialize<float[]>(v, (JsonSerializerOptions?)null)
                    ?? Array.Empty<float>())
            );
    }
}

/// <summary>Cosmos DB-backed context for the News bounded context (database: NewsDb).</summary>
public class CosmosNewsDbContext : DbContext
{
    public CosmosNewsDbContext(DbContextOptions<CosmosNewsDbContext> options) : base(options) { }

    public DbSet<NewsArticle> NewsArticles { get; set; }
    public DbSet<Entity> Entities { get; set; }
    public DbSet<ArticleClaim> ArticleClaims { get; set; }
    public DbSet<Narrative> Narratives { get; set; }
    public DbSet<ArticleClaimEntity> ArticleClaimEntities { get; set; }
    public DbSet<NarrativeClaimLink> NarrativeClaimLinks { get; set; }
    public DbSet<NarrativeEntityLink> NarrativeEntityLinks { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        ConfigureEmbeddingAsCosmos<NewsArticle>(modelBuilder);
        ConfigureEmbeddingAsCosmos<Entity>(modelBuilder);
        ConfigureEmbeddingAsCosmos<ArticleClaim>(modelBuilder);
        ConfigureEmbeddingAsCosmos<Narrative>(modelBuilder);

        // ── NewsArticle ──
        modelBuilder.Entity<NewsArticle>(cfg =>
        {
            cfg.ToContainer("news");
            cfg.HasKey(e => e.Id);
            cfg.HasPartitionKey(e => e.Id);
            cfg.OwnsOne(e => e.Source);
        });

        // ── Entity ──
        modelBuilder.Entity<Entity>(cfg =>
        {
            cfg.ToContainer("entities");
            cfg.HasKey(e => e.Id);
            cfg.HasPartitionKey(e => e.Id);
        });

        // ── ArticleClaim ──
        modelBuilder.Entity<ArticleClaim>(cfg =>
        {
            cfg.ToContainer("claims");
            cfg.HasKey(e => e.Id);
            cfg.HasPartitionKey(e => e.ArticleId);
        });

        // ── Narrative ──
        modelBuilder.Entity<Narrative>(cfg =>
        {
            cfg.ToContainer("narratives");
            cfg.HasKey(e => e.Id);
            cfg.HasPartitionKey(e => e.Id);
        });

        // ── Join: Claim ↔ Entity ──
        modelBuilder.Entity<ArticleClaimEntity>(cfg =>
        {
            cfg.ToContainer("claim-entities");
            cfg.HasKey(e => new { e.ClaimId, e.EntityId });
            cfg.HasPartitionKey(e => e.ClaimId);
        });

        // ── Join: Narrative ↔ Claim ──
        modelBuilder.Entity<NarrativeClaimLink>(cfg =>
        {
            cfg.ToContainer("narrative-claims");
            cfg.HasKey(e => new { e.NarrativeId, e.ClaimId });
            cfg.HasPartitionKey(e => e.NarrativeId);
        });

        // ── Join: Narrative ↔ Entity ──
        modelBuilder.Entity<NarrativeEntityLink>(cfg =>
        {
            cfg.ToContainer("narrative-entities");
            cfg.HasKey(e => new { e.NarrativeId, e.EntityId });
            cfg.HasPartitionKey(e => e.NarrativeId);
        });
    }

    /// <summary>Shared helper: store Embedding as float[] in Cosmos.</summary>
    private static void ConfigureEmbeddingAsCosmos<T>(ModelBuilder modelBuilder) where T : class, ISemanticEntity
    {
        modelBuilder.Entity<T>()
            .Property(e => e.Embedding)
            .HasConversion(
                v => v.ToArray(),
                v => new ReadOnlyMemory<float>(v)
            );
    }
}
