import React from 'react';
import { CanvasState } from '../../../canvas/CanvasTypes';
import { StoryStrip } from '../../story-strip/StoryStrip';
import { ConnectorBand } from '../../connector-band/ConnectorBand';
import './linear-view.scss';

export interface LinearViewProps {
    state: CanvasState;
    onSelectNode: (id: string | null) => void;
}

export const LinearView: React.FC<LinearViewProps> = ({ state, onSelectNode }) => {
    // Sort by date (newest first)
    const sorted = [...state.nodes]
        .filter(n => n.type === 'article' || n.type === 'note')
        .sort((a, b) => {
            const dateA = a.type === 'article' ? a.data.publishedAt : a.data.createdAt;
            const dateB = b.type === 'article' ? b.data.publishedAt : b.data.createdAt;
            return new Date(dateB).getTime() - new Date(dateA).getTime();
        });

    const getEdgeBetween = (id1: string, id2: string) =>
        state.edges.find(e =>
            (e.source === id1 && e.target === id2) ||
            (e.source === id2 && e.target === id1),
        );

    return (
        <div className="rf-linear-view">
            <div className="rf-linear-view__list">
                {sorted.map((node, idx) => {
                    const prev = idx > 0 ? sorted[idx - 1] : null;
                    const edge = prev ? getEdgeBetween(prev.id, node.id) : null;

                    return (
                        <React.Fragment key={node.id}>
                            {edge && (
                                <ConnectorBand
                                    label={edge.label || edge.type}
                                    variant={
                                        edge.type === 'link'
                                            ? 'timeline-link'
                                            : edge.type === 'group-bridge'
                                            ? 'shared-topics'
                                            : 'semantic-neighbor'
                                    }
                                />
                            )}

                            {node.type === 'article' && (
                                <StoryStrip
                                    article={node.data}
                                    state={state.selectedNodeId === node.id ? 'peek' : 'collapsed'}
                                    onExpand={() => onSelectNode(node.id)}
                                    onPin={() => onSelectNode(node.id)}
                                />
                            )}

                            {node.type === 'note' && (
                                <div
                                    className="rf-linear-view__note-card"
                                    onClick={() => onSelectNode(node.id)}
                                >
                                    <div className="rf-linear-view__note-card__header">
                                        <span className="rf-linear-view__note-card__icon">📝</span>
                                        <h4 className="rf-linear-view__note-card__title">{node.data.title}</h4>
                                    </div>
                                    <p className="rf-linear-view__note-card__body">{node.data.body}</p>
                                </div>
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
};
