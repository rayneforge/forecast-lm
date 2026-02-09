import React, { KeyboardEvent } from 'react';
import './top-bar.scss';

export interface TopBarProps {
    title?: string;
    showSearch?: boolean;
    onSearch?: (query: string) => void;
    children?: React.ReactNode;
}

export const TopBar: React.FC<TopBarProps> = ({ 
    title = "Forecast", 
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
                <span className="rf-top-bar__brand-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </span>
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
