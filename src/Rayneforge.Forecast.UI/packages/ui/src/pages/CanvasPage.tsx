import React, { useState, useCallback } from 'react';
import {
    CanvasState,
    CanvasRenderMode,
    CanvasNode,
    CanvasEdge,
    ChainGroup,
    Camera3D,
    Vector3,
    vec3,
} from '../canvas/CanvasTypes';
import { useCanvasState } from '../canvas/useCanvasState';
import { getDepthLabel } from '../canvas/useLayout';
import { FreeCanvasView } from '../components/canvas/free-canvas-view/FreeCanvasView';
import { ThreeCanvasView } from '../components/three-canvas/views/ThreeCanvasView';
import { NavigatorPane } from '../components/canvas/navigator-pane';
import { NewsFeedPane } from '../components/canvas/side-pane/NewsFeedPane';
import type { SearchMode } from '../components/canvas/side-pane/NewsFeedPane';
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
    /** Daily news articles for the dock */
    dailyArticles?: NewsArticle[];
    /** Whether daily news is loading */
    dailyLoading?: boolean;
    /** Search results for the dock */
    searchResults?: NewsArticle[];
    /** Whether search results are loading */
    searchLoading?: boolean;
    /** Fired when user searches from the dock */
    onSearch?: (query: string, mode?: string) => void;
}

/* View labels removed — timeline / linear are now layout modes */

export const CanvasPage: React.FC<CanvasPageProps> = ({
    initialNodes = [],
    initialEdges = [],
    initialGroups = [],
    initialCamera,
    dailyArticles = [],
    dailyLoading,
    searchResults = [],
    searchLoading,
    onSearch,
}) => {
    const { state, dispatch, moveNode, selectNode, addEdge, setRenderMode, reflow, drillIn, drillOut, clearLayout } = useCanvasState({
        nodes: initialNodes,
        edges: initialEdges,
        groups: initialGroups,
        activeView: 'free' as const,
        selectedNodeId: null,
        selectedGroupId: null,
        camera: initialCamera ?? { position: vec3(0, 0, 0), zoom: 1 },
    });

    /* ── Side pane: only one open at a time ('news' | 'navigator' | null) ── */
    type SidePane = 'news' | 'navigator' | null;
    const [activePane, setActivePane] = useState<SidePane>('navigator');

    const togglePane = useCallback((pane: 'news' | 'navigator') => {
        setActivePane(prev => (prev === pane ? null : pane));
    }, []);

    /* ── External detail pane control (article click → detail) ── */
    const [externalDetailNodeId, setExternalDetailNodeId] = useState<string | null>(null);

    /* ── Article preview (click in feed → preview in detail pane, no canvas add) ── */
    const [previewArticle, setPreviewArticle] = useState<NewsArticle | null>(null);

    /** Add a news article as a new ArticleNode on the canvas */
    const handleAddArticleToCanvas = useCallback(
        (article: NewsArticle) => {
            const id = `article-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
            dispatch({
                type: 'ADD_NODE',
                node: {
                    id,
                    type: 'article',
                    position: vec3(
                        -state.camera.position.x + 300 + Math.random() * 100,
                        -state.camera.position.y + 100 + Math.random() * 100,
                        state.nodes.length,
                    ),
                    data: article,
                },
            });
        },
        [dispatch, state.camera.position.x, state.camera.position.y, state.nodes.length],
    );

    /** Click an article in Daily Feed or Search → preview in detail pane (no add) */
    const handleArticleClick = useCallback(
        (article: NewsArticle) => {
            setPreviewArticle(article);
        },
        [],
    );

    /** Add a blank note node (workspace-level action) */
    const handleAddNote = useCallback(() => {
        dispatch({
            type: 'ADD_NODE',
            node: {
                id: `note-${Date.now()}`,
                type: 'note',
                position: vec3(
                    -state.camera.position.x + 200,
                    -state.camera.position.y + 200,
                    state.nodes.length,
                ),
                data: {
                    title: 'New note',
                    body: '',
                    createdAt: new Date().toISOString(),
                },
            },
        });
    }, [dispatch, state.camera.position.x, state.camera.position.y, state.nodes.length]);

    const handleSearchPaneSearch = useCallback(
        (query: string, mode: string) => {
            onSearch?.(query, mode);
        },
        [onSearch],
    );

    const handlePan = (delta: Vector3) => {
        dispatch({ type: 'PAN_CAMERA', delta });
    };

    const handleZoom = (zoom: number) => {
        dispatch({ type: 'SET_CAMERA', camera: { zoom } });
    };

    const handleSelectGroup = (id: string | null) => {
        dispatch({ type: 'SELECT_GROUP', id });
    };

    const handleRemoveGroup = (id: string) => {
        dispatch({ type: 'REMOVE_GROUP', id });
    };

    /** Move all nodes in a chain group by a delta (independent group drag) */
    const handleMoveGroup = useCallback((groupId: string, delta: Vector3) => {
        dispatch({ type: 'MOVE_GROUP', id: groupId, position: delta });
    }, [dispatch]);

    /** Move all nodes in a workspace group by a delta */
    const handleMoveWSGroup = useCallback((groupId: string, delta: Vector3) => {
        dispatch({ type: 'MOVE_WORKSPACE_GROUP', id: groupId, position: delta });
    }, [dispatch]);

    /** Propagate layout from a node (detail-pane Visualize button) */
    const handleVisualize = useCallback((nodeId: string) => {
        reflow('propagate', nodeId);
    }, [reflow]);

    return (
        <div className="rf-canvas-page">
            {/* ── Toolbar (slim) ──────────────────────────── */}
            <div className="rf-canvas-page__toolbar">
                <h2 className="rf-canvas-page__title">Workspace</h2>

                {/* ── Side-pane toggles (mutually exclusive) ── */}
                <button
                    className={`rf-canvas-page__view-btn ${activePane === 'news' ? 'rf-canvas-page__view-btn--active' : ''}`}
                    onClick={() => togglePane('news')}
                    title="Toggle news feed & search"
                >
                    📰 News
                </button>

                {/* ── Navigator toggle ── */}
                <button
                    className={`rf-canvas-page__view-btn ${activePane === 'navigator' ? 'rf-canvas-page__view-btn--active' : ''}`}
                    onClick={() => togglePane('navigator')}
                    title="Toggle navigator pane"
                >
                    🗂 Navigator
                </button>

                {/* ── Render mode toggle (only if WebGL available) ── */}
                {state.deviceCapabilities?.webgl && (
                    <div className="rf-canvas-page__render-toggle">
                        <button
                            className={`rf-canvas-page__view-btn ${state.renderMode === '2d' ? 'rf-canvas-page__view-btn--active' : ''}`}
                            onClick={() => setRenderMode('2d')}
                        >
                            2D
                        </button>
                        <button
                            className={`rf-canvas-page__view-btn ${state.renderMode === '3d' ? 'rf-canvas-page__view-btn--active' : ''}`}
                            onClick={() => setRenderMode('3d')}
                        >
                            3D
                        </button>
                        {state.deviceCapabilities?.immersiveVR && (
                            <span className="rf-canvas-page__xr-badge" title="VR headset detected">🥽 VR</span>
                        )}
                        {state.deviceCapabilities?.immersiveAR && (
                            <span className="rf-canvas-page__xr-badge" title="AR supported">📱 AR</span>
                        )}
                    </div>
                )}
            </div>

            {/* ── Active View ─────────────────────────────── */}
            <div className="rf-canvas-page__canvas-area">
                {state.renderMode === '3d' ? (
                    <ThreeCanvasView
                        state={state}
                        onMoveNode={moveNode}
                        onSelectNode={selectNode}
                        onVisualize={handleVisualize}
                        dailyFeedProps={{
                            open: activePane === 'news',
                            onClose: () => setActivePane(null),
                            articles: dailyArticles,
                            loading: dailyLoading,
                            onAddArticle: handleAddArticleToCanvas,
                            onArticleClick: handleArticleClick,
                        }}
                        searchPaneProps={{
                            open: activePane === 'news',
                            onClose: () => setActivePane(null),
                            results: searchResults,
                            loading: searchLoading,
                            onSearch: handleSearchPaneSearch,
                            onAddArticle: handleAddArticleToCanvas,
                            onArticleClick: handleArticleClick,
                        }}
                    />
                ) : (
                    <FreeCanvasView
                        state={state}
                        onMoveNode={moveNode}
                        onSelectNode={selectNode}
                        onSelectGroup={handleSelectGroup}
                        onRemoveGroup={handleRemoveGroup}
                        onMoveGroup={handleMoveGroup}
                        onMoveWorkspaceGroup={handleMoveWSGroup}
                        onPanCamera={handlePan}
                        onZoom={handleZoom}
                        onAddEdge={addEdge}
                        onVisualize={handleVisualize}
                        /* Layout controls → workspace GroupFrame */
                        onReflow={reflow}
                        onDrillIn={drillIn}
                        onDrillOut={drillOut}
                        onClearLayout={clearLayout}
                        depthLabel={
                            state.activeLayoutMode
                                ? getDepthLabel(state.activeLayoutMode, state.layoutDepth)
                                : undefined
                        }
                        onAddNote={handleAddNote}
                        /* Article click → detail pane */
                        externalDetailNodeId={externalDetailNodeId}
                        onExternalDetailConsumed={() => setExternalDetailNodeId(null)}
                        /* Article preview (click in feed, no add) */
                        previewArticle={previewArticle}
                        onPreviewArticleClear={() => setPreviewArticle(null)}
                        /* Group-by actions from detail pane */
                        onGroupByDate={() => reflow('group-date')}
                        onGroupByLocation={() => reflow('group-location')}
                    />
                )}

                {/* ── Navigator (right side) ── */}
                <NavigatorPane
                    state={state}
                    open={activePane === 'navigator'}
                    onToggle={() => togglePane('navigator')}
                    onSelectNode={(nodeId) => {
                        selectNode(nodeId);
                        setExternalDetailNodeId(nodeId);
                    }}
                />

                {/* ── News Feed (right side — unified daily + search) ── */}
                {state.renderMode !== '3d' && (
                    <NewsFeedPane
                        open={activePane === 'news'}
                        onClose={() => setActivePane(null)}
                        dailyArticles={dailyArticles}
                        dailyLoading={dailyLoading}
                        searchResults={searchResults}
                        searchLoading={searchLoading}
                        onSearch={handleSearchPaneSearch}
                        onAddArticle={handleAddArticleToCanvas}
                        onArticleClick={handleArticleClick}
                    />
                )}
            </div>
        </div>
    );
};
