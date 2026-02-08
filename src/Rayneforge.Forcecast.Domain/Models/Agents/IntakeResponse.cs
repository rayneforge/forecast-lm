using System.Text.Json.Serialization;

namespace Rayneforge.Forecast.Domain.Models.Agents;

public class IntakeResponse
{
    [JsonPropertyName("entities")]
    public List<IntakeEntity> Entities { get; set; } = [];

    [JsonPropertyName("claims")]
    public List<IntakeClaim> Claims { get; set; } = [];

    [JsonPropertyName("evidence_posture")]
    public string EvidencePosture { get; set; } = "";

    [JsonPropertyName("temporal_focus")]
    public string TemporalFocus { get; set; } = "";

    [JsonPropertyName("speculative_narrative")]
    public string SpeculativeNarrative { get; set; } = "";
}

public class IntakeEntity
{
    [JsonPropertyName("entity_type")]
    public string EntityType { get; set; } = "";

    [JsonPropertyName("canonical_name")]
    public string CanonicalName { get; set; } = "";

    [JsonPropertyName("description")]
    public string Description { get; set; } = "";
}

public class IntakeClaim
{
    [JsonPropertyName("normalized_text")]
    public string NormalizedText { get; set; } = "";

    [JsonPropertyName("entity_refs")]
    public List<string> EntityRefs { get; set; } = [];

    [JsonPropertyName("entity_roles")]
    public Dictionary<string, string> EntityRoles { get; set; } = [];
}
