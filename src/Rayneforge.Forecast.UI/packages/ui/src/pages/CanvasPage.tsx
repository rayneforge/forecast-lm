import React, { useState, useCallback } from 'react';
import {
    CanvasNode,
    CanvasEdge,
    ChainGroup,
    Camera3D,
    Vector3,
    vec3,
} from '../canvas/CanvasTypes';
import { useCanvasState } from '../canvas/useCanvasState';
import { ProjectCanvasView } from '../components/canvas/free-canvas-view/ProjectCanvasView';
import { NavigatorPane } from '../components/canvas/navigator-pane';
import { NewsFeedCenter } from '../components/canvas/news-feed-center/NewsFeedCenter';
import type { ChatThreadMessage } from '../components/canvas/news-feed-center/NewsFeedCenter';
import { CommandBar } from '../components/canvas/command-bar/CommandBar';
import type { Attachment } from '../components/canvas/command-bar/CommandBar';
import { DetailPane } from '../components/canvas/detail-pane/DetailPane';
import type { EmbeddedRef } from '../components/canvas/news-feed-center/NewsFeedCenter';
import type { LayoutMode } from '../canvas/useLayout';
import type { NewsArticle } from '@rayneforge/logic';
import './canvas-page.scss';

export interface CanvasPageProps {
    /** Pre-populated nodes (e.g. from a search / import) */
    initialNodes?: CanvasNode[];
    /** Pre-populated edges */
    initialEdges?: CanvasEdge[];
    /** Pre-populated chain groups */
    initialGroups?: ChainGroup[];
    /** Starting camera */
    initialCamera?: Camera3D;

    /* ── Dock / news feeds ── */
    dailyArticles?: NewsArticle[];
    dailyLoading?: boolean;
}

export const CanvasPage: React.FC<CanvasPageProps> = ({
    initialNodes = [],
    initialEdges = [],
    initialGroups = [],
    initialCamera,
    dailyArticles = [],
    dailyLoading,
}) => {
    const { state, dispatch, selectNode, reflow, drillIn, clearLayout } = useCanvasState({
        nodes: initialNodes,
        edges: initialEdges,
        groups: initialGroups,
        activeView: 'free' as const,
        selectedNodeId: null,
        selectedGroupId: null,
        camera: initialCamera ?? { position: vec3(0, 0, 0), zoom: 1 },
    });

    /* ── Center panel: 'feed' (news/search) | 'graph' ── */
    type CenterView = 'feed' | 'graph';
    const [centerView, setCenterView] = useState<CenterView>('feed');

    /* ── Detail pane (left side) — driven by node selection ── */
    const [detailNodeId, setDetailNodeId] = useState<string | null>(null);

    /* ── Article preview (click in feed → preview in detail pane) ── */
    const [previewArticle, setPreviewArticle] = useState<NewsArticle | null>(null);

    /* ── Chat messages thread ── */
    const [chatMessages, setChatMessages] = useState<ChatThreadMessage[]>([]);

    /** Click a ref pill → create a real node on the canvas and open it in the detail pane */
    const handleRefClick = useCallback((ref: EmbeddedRef) => {
        const id = `${ref.type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        let nodeData: any;
        let nodeType: string = ref.type;
        switch (ref.type) {
            case 'entity':
                nodeData = { name: ref.label, type: 'unknown' };
                break;
            case 'narrative':
                nodeData = { label: ref.label, category: 'unknown' };
                break;
            case 'claim':
                nodeData = { normalizedText: ref.label, confidence: 0 };
                break;
            case 'article':
                nodeData = { title: ref.label, url: '', publishedAt: new Date().toISOString(), source: { name: 'Cache' } };
                break;
            default:
                nodeData = { label: ref.label };
                nodeType = 'note';
                break;
        }
        dispatch({
            type: 'ADD_NODE',
            node: {
                id,
                type: nodeType as any,
                position: vec3(100 + Math.random() * 200, 100 + Math.random() * 200, state.nodes.length),
                data: nodeData,
            },
        });
        // Open the newly-created node in the detail pane
        setDetailNodeId(id);
    }, [dispatch, state.nodes.length]);

    /**
     * Organize: clicking the same button drills deeper through depth levels.
     * At max depth the next click clears back to Type view.
     * Clicking a *different* organize button starts that mode at depth 0.
     */
    const handleOrganize = useCallback((mode: LayoutMode) => {
        if (state.activeLayoutMode === mode) {
            // Already in this mode → drill deeper
            const maxDepth = mode === 'group-date' ? 2 : mode === 'group-location' ? 5 : 0;
            if (state.layoutDepth >= maxDepth) {
                // At max → cycle back to clear
                clearLayout();
            } else {
                drillIn();
            }
        } else {
            // Different mode → start at depth 0
            reflow(mode, undefined, 0);
        }
    }, [state.activeLayoutMode, state.layoutDepth, reflow, drillIn, clearLayout]);

    /** Send from command bar → add user message + demo assistant response */
    const handleSend = useCallback((text: string, attachments: Attachment[]) => {
        const userMsg: ChatThreadMessage = {
            id: `msg-${Date.now()}`,
            role: 'user',
            text,
            attachments: attachments.length > 0 ? attachments : undefined,
            timestamp: Date.now(),
        };

        // Demo enriched assistant response
        const assistantMsg: ChatThreadMessage = {
            id: `msg-${Date.now() + 1}`,
            role: 'assistant',
            text: `Here's what I found related to your query.`,
            refs: [
                { type: 'narrative', id: 'n1', icon: '📖', label: 'NATO expansion influence' },
                { type: 'entity', id: 'e1', icon: '🏷', label: 'Ukraine' },
                { type: 'claim', id: 'c1', icon: '💬', label: 'Ceasefire negotiations stalled' },
            ],
            articles: dailyArticles.slice(0, 2),
            timestamp: Date.now() + 500,
        };

        setChatMessages(prev => [...prev, userMsg, assistantMsg]);
    }, [dailyArticles]);

    /** Pin an article: adds it + all linked nodes to the canvas/navigator */
    const handlePinArticle = useCallback(
        (article: NewsArticle) => {
            const id = `article-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
            dispatch({
                type: 'ADD_NODE',
                node: {
                    id,
                    type: 'article',
                    position: vec3(
                        100 + Math.random() * 200,
                        100 + Math.random() * 200,
                        state.nodes.length,
                    ),
                    data: article,
                },
            });
            // TODO: once the backend returns linked claims/narratives/entities with the article,
            // dispatch ADD_NODE + ADD_EDGE for each linked node here
        },
        [dispatch, state.nodes.length],
    );

    /** Click an article in the feed → preview in detail pane */
    const handleArticleClick = useCallback(
        (article: NewsArticle) => {
            setPreviewArticle(article);
        },
        [],
    );

    /** Propagate layout from a node (detail-pane Visualize button) */
    const handleVisualize = useCallback((nodeId: string) => {
        reflow('propagate', nodeId);
    }, [reflow]);

    return (
        <div className="rf-canvas-page">
            {/* ── Toolbar ──────────────────────────────────── */}
            <div className="rf-canvas-page__toolbar">
                <h2 className="rf-canvas-page__title">Workspace</h2>
                <span className="rf-canvas-page__meta">
                    {state.nodes.length} pinned · {state.edges.length} connections
                </span>

                {/* ── Center view toggle (centered) ── */}
                <div className="rf-canvas-page__view-switch">
                    <button
                        className={`rf-canvas-page__view-btn ${centerView === 'feed' ? 'rf-canvas-page__view-btn--active' : ''}`}
                        onClick={() => setCenterView('feed')}
                    >📰 Feed</button>
                    <button
                        className={`rf-canvas-page__view-btn ${centerView === 'graph' ? 'rf-canvas-page__view-btn--active' : ''}`}
                        onClick={() => setCenterView('graph')}
                    >🔗 Graph</button>
                </div>
            </div>

            {/* ── Main content area ───────────────────────── */}
            <div className="rf-canvas-page__body">
                {/* ── Detail pane (left side) ── */}
                <DetailPane
                    state={state}
                    detailNodeId={detailNodeId}
                    onDetailNodeChange={setDetailNodeId}
                    onVisualize={handleVisualize}
                    previewArticle={previewArticle}
                    onPreviewArticleClear={() => setPreviewArticle(null)}
                    onGroupByDate={() => reflow('group-date')}
                    onGroupByLocation={() => reflow('group-location')}
                />

                {/* ── Center panel ── */}
                <div className="rf-canvas-page__center">
                    {centerView === 'feed' && (
                        <NewsFeedCenter
                            messages={chatMessages}
                            dailyArticles={dailyArticles}
                            dailyLoading={dailyLoading}
                            onPinArticle={handlePinArticle}
                            onArticleClick={handleArticleClick}
                            onRefClick={handleRefClick}
                        />
                    )}

                    {centerView === 'graph' && (
                        <ProjectCanvasView
                            state={state}
                            onSelectNode={(id) => {
                                selectNode(id);
                                setDetailNodeId(id);
                            }}
                            onVisualize={handleVisualize}
                            previewArticle={previewArticle}
                            onPreviewArticleClear={() => setPreviewArticle(null)}
                            onGroupByDate={() => reflow('group-date')}
                            onGroupByLocation={() => reflow('group-location')}
                        />
                    )}

                    {/* ── Command bar (bottom input) ── */}
                    <CommandBar onSend={handleSend} />
                </div>

                {/* ── Navigator (right sidebar, always visible) ── */}
                <NavigatorPane
                    state={state}
                    open={true}
                    onToggle={() => {}}
                    onSelectNode={(nodeId) => {
                        selectNode(nodeId);
                        setDetailNodeId(nodeId);
                        if (centerView !== 'feed') {
                            (window as any).__rfScrollToNode?.(nodeId);
                        }
                    }}
                    onOrganize={handleOrganize}
                    onClearLayout={clearLayout}
                />
            </div>
        </div>
    );
};
