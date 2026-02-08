namespace Rayneforge.Forecast.Domain.Models;

using Rayneforge.Forecast.Domain.Abstractions;
using Rayneforge.Forecast.Domain.Attributes;
using System.Reflection;

// ─── Supporting Enums ───────────────────────────────────────────

public enum NarrativeCategory
{
    OptimisticProgress,
    RiskSafety,
    LaborDisplacement,
    NationalSecurity,
    MarketFinance,
    RightsEthics,
    TechnicalRealism,
    MoralPanic
}

public enum EvidencePosture
{
    New,
    Synthesis,
    Commentary
}

public enum TemporalFocus
{
    Immediate,
    Ongoing,
    LongTerm
}

// ─── ArticleClaim ───────────────────────────────────────────────

/// <summary>
/// A medium-grain proposition extracted from a <see cref="NewsArticle"/>.
/// Phrased for reusability — multiple articles may assert the same claim.
/// </summary>
public record ArticleClaim : ISemanticEntity
{
    public string Id { get; init; } = Guid.NewGuid().ToString();

    [Filterable("The normalized claim text")]
    public required string NormalizedText { get; set; }

    [Filterable("The source article ID")]
    public required string ArticleId { get; set; }

    public ReadOnlyMemory<float> Embedding { get; set; }

    // ── Navigation ──
    public NewsArticle? Article { get; set; }
    public ICollection<ArticleClaimEntity> EntityLinks { get; set; } = [];
    public ICollection<NarrativeClaimLink> NarrativeLinks { get; set; } = [];

    // ── ISemanticEntity ──
    string ISemanticEntity.Title => NormalizedText;
    string ISemanticEntity.Content => NormalizedText;
    string? ISemanticEntity.Url => null;

    public ArticleClaim() { }

    public static string GetSchemaDescription()
    {
        var sb = new System.Text.StringBuilder();
        sb.AppendLine($"Entity: {nameof(ArticleClaim)}");

        foreach (var prop in typeof(ArticleClaim).GetProperties(BindingFlags.Public | BindingFlags.Instance))
        {
            var attr = prop.GetCustomAttribute<FilterableAttribute>();
            if (attr == null) continue;

            var typeName = prop.PropertyType == typeof(string) ? "string" : prop.PropertyType.Name;
            var desc = attr.Description != null ? $" - {attr.Description}" : "";
            sb.AppendLine($"- {prop.Name} ({typeName}){desc}");
        }
        return sb.ToString();
    }
}

// ─── Narrative ──────────────────────────────────────────────────

/// <summary>
/// A high-level journalistic narrative derived from article claims.
/// Cross-article by design: a narrative can span many claims from many articles.
/// Narrative assignments are speculative and non-authoritative.
/// </summary>
public record Narrative : ISemanticEntity
{
    public string Id { get; init; } = Guid.NewGuid().ToString();

    [Filterable("The narrative category bucket")]
    public NarrativeCategory Category { get; set; }

    [Filterable("Short label for the narrative")]
    public required string Label { get; set; }

    public string? Justification { get; set; }

    /// <summary>A full narrative write-up informed by supporting claims.</summary>
    public string? WriteUp { get; set; }

    [Filterable("Evidence posture (New, Synthesis, Commentary)")]
    public EvidencePosture EvidencePosture { get; set; }

    [Filterable("Temporal focus (Immediate, Ongoing, LongTerm)")]
    public TemporalFocus TemporalFocus { get; set; }

    public ReadOnlyMemory<float> Embedding { get; set; }

    // ── Navigation ──
    public ICollection<NarrativeClaimLink> ClaimLinks { get; set; } = [];
    public ICollection<NarrativeEntityLink> EntityLinks { get; set; } = [];

    // ── ISemanticEntity ──
    string ISemanticEntity.Title => Label;
    string ISemanticEntity.Content => Justification ?? Label;
    string? ISemanticEntity.Url => null;

    public Narrative() { }

    public static string GetSchemaDescription()
    {
        var sb = new System.Text.StringBuilder();
        sb.AppendLine($"Entity: {nameof(Narrative)}");

        foreach (var prop in typeof(Narrative).GetProperties(BindingFlags.Public | BindingFlags.Instance))
        {
            var attr = prop.GetCustomAttribute<FilterableAttribute>();
            if (attr == null) continue;

            var typeName = prop.PropertyType.IsEnum ? "enum" : prop.PropertyType.Name;
            if (prop.PropertyType == typeof(string)) typeName = "string";
            if (prop.PropertyType == typeof(float)) typeName = "float";

            var desc = attr.Description != null ? $" - {attr.Description}" : "";
            sb.AppendLine($"- {prop.Name} ({typeName}){desc}");
        }
        return sb.ToString();
    }
}

// ─── Join Records (M:M) ────────────────────────────────────────

/// <summary>Links a claim to an entity with an optional role description.</summary>
public record ArticleClaimEntity
{
    public required string ClaimId { get; init; }
    public required string EntityId { get; init; }
    /// <summary>The role this entity plays in the claim (e.g. "subject", "regulator").</summary>
    public string? Role { get; set; }

    public ArticleClaim? Claim { get; set; }
    public Entity? Entity { get; set; }
}

/// <summary>Links a narrative to a supporting claim.</summary>
public record NarrativeClaimLink
{
    public required string NarrativeId { get; init; }
    public required string ClaimId { get; init; }

    public Narrative? Narrative { get; set; }
    public ArticleClaim? Claim { get; set; }
}

/// <summary>Links a narrative directly to a relevant entity.</summary>
public record NarrativeEntityLink
{
    public required string NarrativeId { get; init; }
    public required string EntityId { get; init; }

    public Narrative? Narrative { get; set; }
    public Entity? Entity { get; set; }
}
