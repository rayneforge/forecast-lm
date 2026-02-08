import React from 'react';
import './lens-panel.scss';

export interface FilterOption {
    label: string;
    count?: number;
    active?: boolean;
}

export interface FilterSection {
    title: string;
    options: FilterOption[];
    type: 'checkbox' | 'range' | 'toggle';
}

export interface LensPanelProps {
    filters: FilterSection[];
    isOpen?: boolean;
    onToggle?: () => void;
}

export const LensPanel: React.FC<LensPanelProps> = ({ filters, isOpen = true, onToggle }) => {
    return (
        <aside className={`rf-lens-panel ${isOpen ? 'open' : 'closed'}`}>
            <header className="rf-lens-panel__header">
                <span className="rf-lens-panel__title">Lens</span>
                <button 
                    className="rf-icon-btn" 
                    aria-label="Collapse"
                    onClick={onToggle}
                >
                    ←
                </button>
            </header>

            <div className="rf-lens-panel__content">
                {filters.map((section, idx) => (
                    <div className="rf-filter-section" key={`${section.title}-${idx}`}>
                        <h4 className="rf-filter-section__title">{section.title}</h4>
                        <ul className="rf-filter-list">
                            {section.options.map((opt, optIdx) => (
                                <li 
                                    className={`rf-filter-option ${opt.active ? 'active' : ''}`}
                                    key={`${opt.label}-${optIdx}`}
                                >
                                    <span className={`rf-checkbox ${opt.active ? 'checked' : ''}`} />
                                    <span className="rf-filter-label">{opt.label}</span>
                                    {opt.count !== undefined && (
                                        <span className="rf-filter-count">{opt.count}</span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        </aside>
    );
};
