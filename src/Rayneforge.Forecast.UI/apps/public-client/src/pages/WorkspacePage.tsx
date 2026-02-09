import React, { useMemo } from 'react';
import {
    CanvasPage,
    PinnedBoard,
    PinnedItemProps,
    WorkspaceSelector,
    TopBar,
    useWorkspaces,
} from '@rayneforge/ui';
import type { CanvasNode } from '@rayneforge/ui';
import { NewsClient, type WorkspaceLink, type LinkableItemType } from '@rayneforge/logic';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

// ─── Helpers ────────────────────────────────────────────────────

/** Simple grid layout when no LayoutJson positions are available. */
function autoPosition(index: number, cols = 4) {
    const col = index % cols;
    const row = Math.floor(index / cols);
    return { x: col * 320, y: row * 260, z: 0 };
}

/** Convert WorkspaceLinks → CanvasNodes for the canvas view. */
function linksToCanvasNodes(links: WorkspaceLink[]): CanvasNode[] {
    return links.map((link, i) => {
        const pos = autoPosition(i);

        switch (link.linkedItemType) {
            case 'Note':
                return {
                    id: link.id,
                    type: 'note' as const,
                    position: pos,
                    data: {
                        title: link.title ?? 'Untitled note',
                        body: link.body ?? '',
                        createdAt: link.linkedAt,
                        color: link.color,
                    },
                };

            case 'Narrative':
                return {
                    id: link.id,
                    type: 'narrative' as const,
                    position: pos,
                    data: {
                        label: link.title ?? 'Untitled narrative',
                        category: link.note ?? 'TechnicalRealism',
                        justification: link.body,
                        evidencePosture: 'Synthesis',
                        temporalFocus: 'Ongoing',
                    },
                };

            case 'Claim':
                return {
                    id: link.id,
                    type: 'claim' as const,
                    position: pos,
                    data: {
                        normalizedText: link.title ?? 'Untitled claim',
                        articleId: link.linkedItemId ?? '',
                        articleTitle: link.body,
                    },
                };

            case 'Entity':
                return {
                    id: link.id,
                    type: 'entity' as const,
                    position: pos,
                    data: {
                        type: link.note ?? 'Concept',
                        name: link.title ?? link.linkedItemId ?? 'Unknown entity',
                        description: link.body ?? '',
                    },
                };

            case 'Article':
            default:
                // Articles become ArticleNodes with a lightweight stub.
                // A future enrichment pass can resolve the full NewsArticle.
                return {
                    id: link.id,
                    type: 'article' as const,
                    position: pos,
                    data: {
                        title: link.title ?? link.linkedItemId ?? 'Untitled',
                        description: link.body ?? link.note ?? '',
                        source: { name: link.linkedItemType, id: '' },
                        publishedAt: link.linkedAt,
                        url: '',
                    },
                };
        }
    });
}

// ─── WorkspacePage ──────────────────────────────────────────────
// Full workspace board: sidebar with workspace list + linked items,
// main area with the canvas / newsspace.

export default function WorkspacePage() {
    const navigate = useNavigate();
    const { getAuthHeaders } = useAuth();
    const client = useMemo(
        () => new NewsClient(apiBaseUrl, getAuthHeaders),
        [getAuthHeaders],
    );

    const {
        workspaces,
        activeWorkspace,
        isLoading,
        selectWorkspace,
        createWorkspace,
        removeLink,
    } = useWorkspaces({ client });

    // Map WorkspaceLink → PinnedItemProps grouped by type
    const links = activeWorkspace?.links ?? [];

    const pinnedItems: { group?: string; item: PinnedItemProps }[] =
        links.map((link: WorkspaceLink) => ({
            group: link.linkedItemType,
            item: {
                id: link.id,
                title: link.title ?? link.linkedItemId ?? 'Untitled',
                subtitle: link.linkedItemType,
                itemType: link.linkedItemType as LinkableItemType,
                note: link.note,
            },
        }));

    const canvasNodes = useMemo(() => linksToCanvasNodes(links), [links]);

    return (
        <div className="rf-workspace-page">
            <TopBar showSearch={false}>
                <button
                    className="rf-workspace-page__back"
                    onClick={() => navigate('/home')}
                    title="Back to feed"
                >
                    ← Feed
                </button>
                <h2 className="rf-workspace-page__title">
                    {activeWorkspace?.name ?? 'Workspaces'}
                </h2>
            </TopBar>

            <div className="rf-workspace-page__body">
                <aside className="rf-workspace-page__sidebar">
                    <WorkspaceSelector
                        workspaces={workspaces}
                        activeId={activeWorkspace?.id}
                        onSelect={selectWorkspace}
                        onCreate={(name) => createWorkspace({ name })}
                    />
                </aside>

                <div className="rf-workspace-page__canvas">
                    {activeWorkspace ? (
                        <CanvasPage initialNodes={canvasNodes} />
                    ) : (
                        <div className="rf-workspace-page__empty">
                            {isLoading
                                ? 'Loading…'
                                : 'Select or create a workspace to get started.'}
                        </div>
                    )}
                </div>

                {activeWorkspace && pinnedItems.length > 0 && (
                    <PinnedBoard
                        items={pinnedItems}
                        onUnpin={removeLink}
                    />
                )}
            </div>
        </div>
    );
}
