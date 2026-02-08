using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Rayneforge.Forecast.Infrastructure.Migrations.SqliteNews
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Entities",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", nullable: false),
                    EntityType = table.Column<int>(type: "INTEGER", nullable: false),
                    CanonicalName = table.Column<string>(type: "TEXT", nullable: false),
                    Description = table.Column<string>(type: "TEXT", nullable: true),
                    Embedding = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Entities", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Narratives",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", nullable: false),
                    Category = table.Column<int>(type: "INTEGER", nullable: false),
                    Label = table.Column<string>(type: "TEXT", nullable: false),
                    Justification = table.Column<string>(type: "TEXT", nullable: true),
                    WriteUp = table.Column<string>(type: "TEXT", nullable: true),
                    EvidencePosture = table.Column<int>(type: "INTEGER", nullable: false),
                    TemporalFocus = table.Column<int>(type: "INTEGER", nullable: false),
                    Embedding = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Narratives", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "NewsArticles",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", nullable: false),
                    Source_Id = table.Column<string>(type: "TEXT", nullable: true),
                    Source_Name = table.Column<string>(type: "TEXT", nullable: false),
                    Author = table.Column<string>(type: "TEXT", nullable: true),
                    Title = table.Column<string>(type: "TEXT", nullable: false),
                    Description = table.Column<string>(type: "TEXT", nullable: true),
                    Url = table.Column<string>(type: "TEXT", nullable: false),
                    UrlToImage = table.Column<string>(type: "TEXT", nullable: true),
                    PublishedAt = table.Column<DateTimeOffset>(type: "TEXT", nullable: false),
                    Content = table.Column<string>(type: "TEXT", nullable: true),
                    SpeculativeNarrative = table.Column<string>(type: "TEXT", nullable: true),
                    Embedding = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NewsArticles", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "NarrativeEntityLinks",
                columns: table => new
                {
                    NarrativeId = table.Column<string>(type: "TEXT", nullable: false),
                    EntityId = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NarrativeEntityLinks", x => new { x.NarrativeId, x.EntityId });
                    table.ForeignKey(
                        name: "FK_NarrativeEntityLinks_Entities_EntityId",
                        column: x => x.EntityId,
                        principalTable: "Entities",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_NarrativeEntityLinks_Narratives_NarrativeId",
                        column: x => x.NarrativeId,
                        principalTable: "Narratives",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ArticleClaims",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", nullable: false),
                    NormalizedText = table.Column<string>(type: "TEXT", nullable: false),
                    ArticleId = table.Column<string>(type: "TEXT", nullable: false),
                    Embedding = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ArticleClaims", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ArticleClaims_NewsArticles_ArticleId",
                        column: x => x.ArticleId,
                        principalTable: "NewsArticles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ArticleClaimEntities",
                columns: table => new
                {
                    ClaimId = table.Column<string>(type: "TEXT", nullable: false),
                    EntityId = table.Column<string>(type: "TEXT", nullable: false),
                    Role = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ArticleClaimEntities", x => new { x.ClaimId, x.EntityId });
                    table.ForeignKey(
                        name: "FK_ArticleClaimEntities_ArticleClaims_ClaimId",
                        column: x => x.ClaimId,
                        principalTable: "ArticleClaims",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ArticleClaimEntities_Entities_EntityId",
                        column: x => x.EntityId,
                        principalTable: "Entities",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "NarrativeClaimLinks",
                columns: table => new
                {
                    NarrativeId = table.Column<string>(type: "TEXT", nullable: false),
                    ClaimId = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NarrativeClaimLinks", x => new { x.NarrativeId, x.ClaimId });
                    table.ForeignKey(
                        name: "FK_NarrativeClaimLinks_ArticleClaims_ClaimId",
                        column: x => x.ClaimId,
                        principalTable: "ArticleClaims",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_NarrativeClaimLinks_Narratives_NarrativeId",
                        column: x => x.NarrativeId,
                        principalTable: "Narratives",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ArticleClaimEntities_EntityId",
                table: "ArticleClaimEntities",
                column: "EntityId");

            migrationBuilder.CreateIndex(
                name: "IX_ArticleClaims_ArticleId",
                table: "ArticleClaims",
                column: "ArticleId");

            migrationBuilder.CreateIndex(
                name: "IX_Entities_EntityType_CanonicalName",
                table: "Entities",
                columns: new[] { "EntityType", "CanonicalName" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_NarrativeClaimLinks_ClaimId",
                table: "NarrativeClaimLinks",
                column: "ClaimId");

            migrationBuilder.CreateIndex(
                name: "IX_NarrativeEntityLinks_EntityId",
                table: "NarrativeEntityLinks",
                column: "EntityId");

            migrationBuilder.CreateIndex(
                name: "IX_Narratives_Category",
                table: "Narratives",
                column: "Category");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ArticleClaimEntities");

            migrationBuilder.DropTable(
                name: "NarrativeClaimLinks");

            migrationBuilder.DropTable(
                name: "NarrativeEntityLinks");

            migrationBuilder.DropTable(
                name: "ArticleClaims");

            migrationBuilder.DropTable(
                name: "Entities");

            migrationBuilder.DropTable(
                name: "Narratives");

            migrationBuilder.DropTable(
                name: "NewsArticles");
        }
    }
}
