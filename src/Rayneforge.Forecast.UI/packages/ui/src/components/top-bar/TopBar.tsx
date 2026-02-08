import React, { KeyboardEvent } from 'react';
import './top-bar.scss';

export interface TopBarProps {
    title?: string;
    showSearch?: boolean;
    onSearch?: (query: string) => void;
    children?: React.ReactNode;
}

export const TopBar: React.FC<TopBarProps> = ({ 
    title = "Rayneforge", 
    showSearch = true, 
    onSearch,
    children
}) => {
    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            onSearch?.(e.currentTarget.value);
        }
    };

    return (
        <header className="rf-top-bar">
            {/* Logo Area */}
            <div className="rf-top-bar__logo">
                <span className="rf-top-bar__brand-icon">⚡</span>
                <span className="rf-top-bar__brand-text">{title}</span>
            </div>

            {/* Search Area */}
            {showSearch ? (
                <div className="rf-top-bar__search">
                    <span className="rf-search-icon">🔍</span>
                    <input 
                        type="text" 
                        className="rf-search-input" 
                        placeholder="Search topics, entities, or commands... (/)"
                        onKeyDown={handleKeyDown}
                    />
                </div>
            ) : (
                <div style={{ flex: 1 }} />
            )}

            {/* Controls Area */}
            <div className="rf-top-bar__controls">
                {children}
                <div className="rf-toggle-group">
                    <button className="rf-icon-btn active" aria-label="List View">☰</button>
                    <button className="rf-icon-btn" aria-label="Graph View">🕸</button>
                </div>
                
                <div className="rf-user-avatar">RB</div>
            </div>
        </header>
    );
};
