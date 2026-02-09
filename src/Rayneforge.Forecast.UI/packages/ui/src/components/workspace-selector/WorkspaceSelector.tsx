import React, { useState } from 'react';
import type { Workspace } from '@rayneforge/logic';
import './workspace-selector.scss';

export interface WorkspaceSelectorProps {
    workspaces: Workspace[];
    activeId?: string;
    onSelect: (id: string) => void;
    onCreate: (name: string) => void;
}

export const WorkspaceSelector: React.FC<WorkspaceSelectorProps> = ({
    workspaces,
    activeId,
    onSelect,
    onCreate,
}) => {
    const [creating, setCreating] = useState(false);
    const [newName, setNewName] = useState('');

    const handleCreate = () => {
        if (newName.trim()) {
            onCreate(newName.trim());
            setNewName('');
            setCreating(false);
        }
    };

    return (
        <div className="rf-workspace-selector">
            <div className="rf-workspace-selector__header">
                <h3>Workspaces</h3>
                <button
                    className="rf-workspace-selector__create-btn"
                    onClick={() => setCreating(!creating)}
                >
                    {creating ? 'Cancel' : '+ New'}
                </button>
            </div>

            {creating && (
                <form
                    onSubmit={(e) => { e.preventDefault(); handleCreate(); }}
                    style={{ display: 'flex', gap: '8px' }}
                >
                    <input
                        autoFocus
                        placeholder="Workspace name…"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        style={{
                            flex: 1,
                            background: 'transparent',
                            border: '1px solid var(--color-border-subtle, #2a2f3a)',
                            borderRadius: '4px',
                            padding: '6px 8px',
                            color: 'inherit',
                            fontSize: '13px',
                        }}
                    />
                    <button
                        type="submit"
                        className="rf-workspace-selector__create-btn"
                        disabled={!newName.trim()}
                    >
                        Create
                    </button>
                </form>
            )}

            <div className="rf-workspace-selector__list">
                {workspaces.length === 0 && !creating && (
                    <div className="rf-workspace-selector__empty">
                        No workspaces yet. Create one to start curating.
                    </div>
                )}

                {workspaces.map((ws) => (
                    <button
                        key={ws.id}
                        className={`rf-workspace-selector__item ${ws.id === activeId ? 'rf-workspace-selector__item--active' : ''}`}
                        onClick={() => onSelect(ws.id)}
                    >
                        <span className="rf-workspace-selector__name">{ws.name}</span>
                        <span className="rf-workspace-selector__count">
                            {ws.links?.length ?? 0} items
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
};
