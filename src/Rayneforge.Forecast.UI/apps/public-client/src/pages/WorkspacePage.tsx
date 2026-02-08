import React from 'react';
import {
    CanvasPage,
    CanvasNode,
    CanvasEdge,
    ChainGroup,
    vec3,
} from '@rayneforge/ui';
import { useNavigate } from 'react-router-dom';

// ─── WorkspacePage ──────────────────────────────────────────────
// The interactive canvas / newsspace.
// Wraps the <CanvasPage> component with routing-aware chrome.
// In a real app, nodes/edges/narratives would come from an API or
// local storage.  For now it renders empty or with demo data.

export default function WorkspacePage() {
    const navigate = useNavigate();

    return (
        <div className="rf-workspace-page">
            {/* Slim nav bar with back link */}
            <nav className="rf-workspace-page__nav">
                <button
                    className="rf-workspace-page__back"
                    onClick={() => navigate('/home')}
                    title="Back to feed"
                >
                    ← Feed
                </button>
                <h2 className="rf-workspace-page__title">Newsspace</h2>
            </nav>

            <div className="rf-workspace-page__canvas">
                <CanvasPage />
            </div>
        </div>
    );
}
