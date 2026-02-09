import React, { useCallback } from 'react';
import { WorkspaceGroup, CanvasNode } from '../../../canvas/CanvasTypes';
import './workspace-overlay.scss';

export interface WorkspaceOverlayProps {
    /** The workspace currently being drilled into */
    workspace: WorkspaceGroup;
    /** All canvas nodes (to resolve member info) */
    nodes: CanvasNode[];
    /** Exit drill-down back to full canvas */
    onClose: () => void;
    /** Select a node within the workspace */
    onSelectNode?: (nodeId: string) => void;
}

export const WorkspaceOverlay: React.FC<WorkspaceOverlayProps> = ({
    workspace, nodes, onClose, onSelectNode,
}) => {
    const memberNodes = nodes.filter(n => workspace.nodeIds.includes(n.id));

    const nodeLabel = useCallback((n: CanvasNode) => {
        switch (n.type) {
            case 'article': return n.data.title;
            case 'note':    return n.data.title;
            case 'entity':  return n.data.name;
            case 'narrative': return n.data.label;
            case 'claim':   return n.data.normalizedText.slice(0, 60) + (n.data.normalizedText.length > 60 ? '…' : '');
        }
    }, []);

    const typeIcon = (type: string) => {
        switch (type) {
            case 'article':   return '📰';
            case 'note':      return '📝';
            case 'entity':    return '🏷️';
            case 'topic':     return '💬';
            case 'narrative': return '📊';
            case 'claim':     return '❝';
            default:          return '·';
        }
    };

    return (
        <div className="rf-workspace-overlay">
            <div className="rf-workspace-overlay__backdrop" onClick={onClose} />
            <div className="rf-workspace-overlay__panel">
                <header className="rf-workspace-overlay__header">
                    <div className="rf-workspace-overlay__title-row">
                        <span className="rf-workspace-overlay__icon">📁</span>
                        <h2 className="rf-workspace-overlay__title">{workspace.label}</h2>
                        <span className="rf-workspace-overlay__count">{memberNodes.length} items</span>
                    </div>
                    <button className="rf-workspace-overlay__close" onClick={onClose} aria-label="Close overlay">
                        ✕
                    </button>
                </header>

                <div className="rf-workspace-overlay__body">
                    {memberNodes.length === 0 ? (
                        <p className="rf-workspace-overlay__empty">
                            Drag nodes into this workspace group to populate it.
                        </p>
                    ) : (
                        <ul className="rf-workspace-overlay__list">
                            {memberNodes.map(n => (
                                <li
                                    key={n.id}
                                    className="rf-workspace-overlay__item"
                                    onClick={() => onSelectNode?.(n.id)}
                                >
                                    <span className="rf-workspace-overlay__item-icon">{typeIcon(n.type)}</span>
                                    <span className="rf-workspace-overlay__item-type">{n.type}</span>
                                    <span className="rf-workspace-overlay__item-label">{nodeLabel(n)}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
};
