import type { Meta, StoryObj } from '@storybook/react';
import { CanvasPage } from './CanvasPage';
import {
    ArticleNode, NoteNode, EntityNode,
    NarrativeNode, ClaimNode,
    CanvasEdge, ChainGroup,
    vec3,
} from '../canvas/CanvasTypes';
import { NewsArticle, ArticleTopic } from '@rayneforge/logic';

/* ── Helper ─────────────────────────────────────────────────── */

const ago = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString();
};

/* ── Topics (shared across articles) ─────────────────────────── */

const TOPICS: Record<string, ArticleTopic> = {
    macro:       { id: 'topic-macro',       label: 'Macro',              confidence: 0.92 },
    energy:      { id: 'topic-energy',      label: 'Energy',             confidence: 0.88 },
    ai:          { id: 'topic-ai',          label: 'AI',                 confidence: 0.95 },
    regulation:  { id: 'topic-regulation',  label: 'Regulation',         confidence: 0.80 },
    geopolitics: { id: 'topic-geopolitics', label: 'Geopolitics',        confidence: 0.72 },
    trade:       { id: 'topic-trade',       label: 'Trade',              confidence: 0.65 },
    tech:        { id: 'topic-tech',        label: 'Tech',               confidence: 0.85 },
};

/* ── Articles ───────────────────────────────────────────────── */

const mkArticle = (
    id: string, title: string, daysAgo: number,
    tags: string[] = [], topics: ArticleTopic[] = [],
): ArticleNode => {
    const data: NewsArticle = {
        title,
        description: `Analysis of ${title.toLowerCase()} and its broader implications for global markets.`,
        source: { name: 'Reuters', id: 'reuters' },
        publishedAt: ago(daysAgo),
        url: '#',
        imageUrl: 'https://placehold.co/600x400',
        tags,
        topics,
    };
    return { id, type: 'article', position: vec3(0, 0, 0), data };
};

const articles: ArticleNode[] = [
    mkArticle('a1', 'Fed Signals Rate Pause', 2, ['Economy', 'Fed'], [TOPICS.macro]),
    mkArticle('a2', 'Oil Prices Surge on OPEC Cuts', 5, ['Energy', 'OPEC'], [TOPICS.energy, TOPICS.geopolitics]),
    mkArticle('a3', 'Tech Earnings Beat Expectations', 8, ['Tech', 'Earnings'], [TOPICS.tech, TOPICS.ai]),
    mkArticle('a4', 'EU Introduces AI Regulation', 15, ['AI', 'Regulation'], [TOPICS.ai, TOPICS.regulation]),
    mkArticle('a5', 'Supply Chain Disruptions Ease', 30, ['Logistics', 'Trade'], [TOPICS.trade, TOPICS.geopolitics]),
    mkArticle('a6', 'China GDP Growth Slows', 60, ['China', 'GDP'], [TOPICS.macro, TOPICS.geopolitics]),
];

articles[0].position = vec3(100, 80, 1);
articles[1].position = vec3(420, 160, 2);
articles[2].position = vec3(180, 340, 3);
articles[3].position = vec3(550, 60, 4);
articles[4].position = vec3(60, 520, 5);
articles[5].position = vec3(480, 400, 6);

/* ── Notes ──────────────────────────────────────────────────── */

const notes: NoteNode[] = [
    {
        id: 'n1', type: 'note', position: vec3(320, 260, 7),
        data: { title: 'Watch correlation', body: 'Oil prices and Fed policy may converge Q3.', createdAt: ago(0) },
    },
    {
        id: 'n2', type: 'note', position: vec3(640, 300, 8),
        data: { title: 'AI thesis', body: 'EU regulation could slow European AI startups but boost compliance-tech.', createdAt: ago(1) },
    },
];

/* ── Entities ───────────────────────────────────────────────── */

const entities: EntityNode[] = [
    {
        id: 'ent1', type: 'entity', position: vec3(350, 480, 15),
        data: { type: 'Organization', name: 'OpenAI', description: 'Artificial intelligence research lab.' },
    },
    {
        id: 'ent2', type: 'entity', position: vec3(580, 520, 16),
        data: { type: 'Person', name: 'Sam Altman', description: 'CEO of OpenAI and former president of Y Combinator.' },
    },
    {
        id: 'ent3', type: 'entity', position: vec3(750, 440, 17),
        data: { type: 'Organization', name: 'OPEC', description: 'Organization of the Petroleum Exporting Countries.' },
    },
];

/* ── Narratives (canvas-level nodes) ─────────────────────────── */

const narrativeNodes: NarrativeNode[] = [
    {
        id: 'nar-node1', type: 'narrative', position: vec3(820, 300, 20),
        data: {
            label: 'AI Industry: Regulated Growth',
            category: 'OptimisticProgress',
            evidencePosture: 'Synthesis',
            temporalFocus: 'Ongoing',
            justification: 'Convergence of strong earnings and regulatory clarity suggests sustained growth.',
        },
    },
    {
        id: 'nar-node2', type: 'narrative', position: vec3(100, 650, 21),
        data: {
            label: 'Macro Headwinds Threaten EM',
            category: 'MarketFinance',
            evidencePosture: 'New',
            temporalFocus: 'Immediate',
        },
    },
];

/* ── Claims (canvas-level nodes) ─────────────────────────────── */

const claimNodes: ClaimNode[] = [
    {
        id: 'cl-node1', type: 'claim', position: vec3(860, 180, 22),
        data: { normalizedText: 'OpenAI revenue growth beat analyst forecasts by 40%.', articleId: 'a3', articleTitle: 'Tech Earnings Beat Expectations' },
    },
    {
        id: 'cl-node2', type: 'claim', position: vec3(900, 420, 23),
        data: { normalizedText: 'EU AI Act imposes strict compliance on frontier model providers.', articleId: 'a4', articleTitle: 'EU Introduces AI Regulation' },
    },
    {
        id: 'cl-node3', type: 'claim', position: vec3(200, 740, 24),
        data: { normalizedText: 'OPEC production cuts pushed Brent above $90/barrel.', articleId: 'a2', articleTitle: 'Oil Prices Surge on OPEC Cuts' },
    },
];

/* ── Edges ───────────────────────────────────────────────────── */

const edges: CanvasEdge[] = [
    // Article ↔ Article / Note links
    { id: 'e1', source: 'a1', target: 'a2', type: 'link', label: 'Inflation ↔ Oil' },
    { id: 'e2', source: 'a3', target: 'n2', type: 'relation', label: 'AI outlook' },
    { id: 'e3', source: 'a4', target: 'n2', type: 'link' },
    { id: 'e4', source: 'a1', target: 'n1', type: 'relation' },
    { id: 'e5', source: 'a5', target: 'a6', type: 'group-bridge', label: 'Supply chain' },
    // Entity → Article relations
    { id: 'e6', source: 'ent1', target: 'a3', type: 'relation', label: 'Earnings subject' },
    { id: 'e7', source: 'ent1', target: 'a4', type: 'relation', label: 'Regulated by' },
    { id: 'e8', source: 'ent2', target: 'a3', type: 'relation', label: 'CEO commentary' },
    { id: 'e9', source: 'ent2', target: 'ent1', type: 'relation', label: 'CEO of' },
    { id: 'e10', source: 'ent3', target: 'a2', type: 'relation', label: 'OPEC cuts' },
    // Narrative → Claim → Article flow
    { id: 'e11', source: 'nar-node1', target: 'cl-node1', type: 'relation', label: 'Supported by' },
    { id: 'e12', source: 'nar-node1', target: 'cl-node2', type: 'relation', label: 'Supported by' },
    { id: 'e13', source: 'nar-node2', target: 'cl-node3', type: 'relation', label: 'Supported by' },
    { id: 'e14', source: 'cl-node1', target: 'a3', type: 'relation', label: 'Extracted from' },
    { id: 'e15', source: 'cl-node2', target: 'a4', type: 'relation', label: 'Extracted from' },
    { id: 'e16', source: 'cl-node3', target: 'a2', type: 'relation', label: 'Extracted from' },
];

/* ── Chain Groups ────────────────────────────────────────────── */

const groups: ChainGroup[] = [
    {
        id: 'g1',
        label: 'Fed & Oil Policy',
        nodeIds: ['a1', 'a2', 'n1'],
        position: vec3(60, 50, 0),
        color: '#00D2FF',
    },
    {
        id: 'g2',
        label: 'AI Regulation',
        nodeIds: ['a4', 'ent1', 'cl-node2'],
        position: vec3(500, 30, 0),
        color: '#FF6B6B',
    },
];

/* ── Dock Mock Data ──────────────────────────────────────────── */

const dailyArticles: NewsArticle[] = [
    { title: 'Asian Markets Open Higher on Tech Rally', description: 'Regional indices gained as tech sector optimism spread.', source: { name: 'Bloomberg' }, publishedAt: ago(0), url: '#', tags: ['Markets', 'Asia'] },
    { title: 'Crude Inventories Drop More Than Expected', description: 'EIA data shows drawdown of 4.2M barrels.', source: { name: 'Reuters' }, publishedAt: ago(0), url: '#', tags: ['Energy'] },
    { title: 'European Central Bank Holds Rates Steady', description: 'ECB signals no change until H2 data reviewed.', source: { name: 'FT' }, publishedAt: ago(1), url: '#', tags: ['ECB', 'Rates'] },
];

/* ── All Nodes ───────────────────────────────────────────────── */

const allNodes = [...articles, ...notes, ...entities, ...narrativeNodes, ...claimNodes];

/* ── Stories ─────────────────────────────────────────────────── */

const meta: Meta<typeof CanvasPage> = {
    title: 'Pages/CanvasWorkspace',
    component: CanvasPage,
    parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof CanvasPage>;

/** Full workspace with every node type, edges, groups, narratives, and dock feed */
export const FullWorkspace: Story = {
    args: {
        initialNodes: allNodes,
        initialEdges: edges,
        initialGroups: groups,
        dailyArticles,
        dailyLoading: false,
    },
};

/** Articles and notes only — simple research board */
export const ArticlesAndNotes: Story = {
    args: {
        initialNodes: [...articles, ...notes],
        initialEdges: edges.filter(e => e.source.startsWith('a') || e.source.startsWith('n')),
        initialGroups: [groups[0]],
        dailyArticles,
    },
};

/** Narrative-focused view with claims, narratives, and entity relations */
export const NarrativeView: Story = {
    args: {
        initialNodes: [...articles.slice(0, 3), ...entities, ...narrativeNodes, ...claimNodes],
        initialEdges: edges.filter(e =>
            e.source.startsWith('nar') || e.source.startsWith('cl') ||
            e.source.startsWith('ent') || e.target.startsWith('ent'),
        ),
        initialGroups: [groups[1]],
    },
};

/** Empty canvas — blank slate */
export const EmptyCanvas: Story = {
    args: {
        initialNodes: [],
        initialEdges: [],
        initialGroups: [],
    },
};

/** Loading state for dock */
export const DockLoading: Story = {
    args: {
        initialNodes: allNodes.slice(0, 4),
        initialEdges: [],
        initialGroups: [],
        dailyLoading: true,
        searchLoading: true,
    },
};
