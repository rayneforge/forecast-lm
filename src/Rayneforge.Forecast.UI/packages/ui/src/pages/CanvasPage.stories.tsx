import type { Meta, StoryObj } from '@storybook/react';
import { CanvasPage } from './CanvasPage';
import { ArticleNode, NoteNode, EntityNode, TopicBubble, CanvasEdge, ChainGroup, vec3 } from '../canvas/CanvasTypes';
import { NarrativeClaim, NarrativeData } from '../components/canvas/narrative-pane/NarrativePane';
import { NewsArticle } from '@rayneforge/logic';

/* ── Mock Data ──────────────────────────────────────────────── */

const mkArticle = (id: string, title: string, daysAgo: number, tags: string[] = []): ArticleNode => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    const data: NewsArticle = {
        title,
        description: `Analysis of ${title.toLowerCase()} and its broader implications for global markets.`,
        source: { name: 'Reuters', id: 'reuters' },
        publishedAt: d.toISOString(),
        url: '#',
        imageUrl: 'https://placehold.co/600x400',
        tags,
    };
    return { id, type: 'article', position: vec3(0, 0, 0), data };
};

const articles: ArticleNode[] = [
    mkArticle('a1', 'Fed Signals Rate Pause', 2, ['Economy', 'Fed']),
    mkArticle('a2', 'Oil Prices Surge on OPEC Cuts', 5, ['Energy', 'OPEC']),
    mkArticle('a3', 'Tech Earnings Beat Expectations', 8, ['Tech', 'Earnings']),
    mkArticle('a4', 'EU Introduces AI Regulation', 15, ['AI', 'Regulation']),
    mkArticle('a5', 'Supply Chain Disruptions Ease', 30, ['Logistics', 'Trade']),
    mkArticle('a6', 'China GDP Growth Slows', 60, ['China', 'GDP']),
];

// Spread them across the canvas
articles[0].position = vec3(100, 80, 1);
articles[1].position = vec3(420, 160, 2);
articles[2].position = vec3(180, 340, 3);
articles[3].position = vec3(550, 60, 4);
articles[4].position = vec3(60, 520, 5);
articles[5].position = vec3(480, 400, 6);

const notes: NoteNode[] = [
    {
        id: 'n1',
        type: 'note',
        position: vec3(320, 260, 7),
        data: { title: 'Watch correlation', body: 'Oil prices and Fed policy may converge Q3.', createdAt: new Date().toISOString() },
    },
    {
        id: 'n2',
        type: 'note',
        position: vec3(640, 300, 8),
        data: { title: 'AI thesis', body: 'EU regulation could slow European AI startups but boost compliance-tech.', createdAt: new Date().toISOString() },
    },
];

const entities: EntityNode[] = [
    {
        id: 'ent1',
        type: 'entity',
        position: vec3(350, 480, 15),
        data: { type: 'Company', name: 'OpenAI', description: 'Artificial intelligence research lab consisting of the for-profit corporation OpenAI LP and its parent company, the non-profit OpenAI Inc.' },
    },
    {
        id: 'ent2',
        type: 'entity',
        position: vec3(580, 520, 16),
        data: { type: 'Person', name: 'Sam Altman', description: 'CEO of OpenAI and former president of Y Combinator.' },
    },
];

const topics: TopicBubble[] = [
    { id: 't1', type: 'topic', position: vec3(700, 80, 9), data: { label: 'Macro', weight: 0.9 } },
    { id: 't2', type: 'topic', position: vec3(750, 200, 10), data: { label: 'Tech', weight: 0.7 } },
    { id: 't3', type: 'topic', position: vec3(50, 400, 11), data: { label: 'Geopolitics', weight: 0.5 } },
];

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
    // Entity → Entity relations
    { id: 'e9', source: 'ent2', target: 'ent1', type: 'relation', label: 'CEO of' },
];

const groups: ChainGroup[] = [
    {
        id: 'g1',
        label: 'Macro Chain',
        nodeIds: ['a1', 'a2', 'n1'],
        position: vec3(60, 50, 0),
        color: '#00D2FF',
    },
];

/* ── Claims & Narratives ────────────────────────────────────── */

const claims: NarrativeClaim[] = [
    { id: 'c1', text: 'OpenAI revenue growth beat analyst forecasts by 40%', articleId: 'a3', articleTitle: 'Tech Earnings Beat Expectations' },
    { id: 'c2', text: 'EU AI Act imposes strict compliance on frontier model providers', articleId: 'a4', articleTitle: 'EU Introduces AI Regulation' },
    { id: 'c3', text: 'Sam Altman testified that regulation supports responsible scaling', articleId: 'a4', articleTitle: 'EU Introduces AI Regulation' },
    { id: 'c4', text: 'Federal Reserve paused interest rates citing cooling inflation', articleId: 'a1', articleTitle: 'Fed Signals Rate Pause' },
    { id: 'c5', text: 'OPEC production cuts pushed Brent above $90/barrel', articleId: 'a2', articleTitle: 'Oil Prices Surge on OPEC Cuts' },
    { id: 'c6', text: 'China GDP missed consensus, raising global demand concerns', articleId: 'a6', articleTitle: 'China GDP Growth Slows' },
];

const narratives: NarrativeData[] = [
    {
        id: 'nar1',
        label: 'AI Industry Poised for Regulated Growth',
        category: 'OptimisticProgress',
        confidence: 0.82,
        claimIds: ['c1', 'c2', 'c3'],
    },
    {
        id: 'nar2',
        label: 'Macro Headwinds Threaten Emerging Markets',
        category: 'MarketFinance',
        confidence: 0.68,
        claimIds: ['c4', 'c5', 'c6'],
    },
    {
        id: 'nar3',
        label: 'Frontier AI Safety Under Regulatory Scrutiny',
        category: 'RiskSafety',
        confidence: 0.75,
        claimIds: ['c2', 'c3'],
    },
];

/* ── Stories ─────────────────────────────────────────────────── */

const meta: Meta<typeof CanvasPage> = {
    title: 'Pages/CanvasWorkspace',
    component: CanvasPage,
    parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof CanvasPage>;

export const FreeCanvas: Story = {
    args: {
        initialNodes: [...articles, ...notes, ...entities, ...topics],
        initialEdges: edges,
        initialGroups: groups,
        initialView: 'free',
        narratives,
        claims,
    },
};

export const Timeline: Story = {
    args: {
        initialNodes: [...articles, ...notes, ...entities, ...topics],
        initialEdges: edges,
        initialGroups: groups,
        initialView: 'timeline',
        narratives,
        claims,
    },
};

export const Linear: Story = {
    args: {
        initialNodes: [...articles, ...notes],
        initialEdges: edges,
        initialGroups: [],
        initialView: 'linear',
        narratives,
        claims,
    },
};

export const EmptyCanvas: Story = {
    args: {
        initialNodes: [],
        initialEdges: [],
        initialGroups: [],
        initialView: 'free',
    },
};
