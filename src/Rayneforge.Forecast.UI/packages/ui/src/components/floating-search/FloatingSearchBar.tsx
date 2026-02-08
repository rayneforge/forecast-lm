import React, { KeyboardEvent, useState } from 'react';
import './floating-search.scss';

export interface FloatingSearchBarProps {
    onSearch?: (query: string) => void;
    placeholder?: string;
}

export const FloatingSearchBar: React.FC<FloatingSearchBarProps> = ({ 
    onSearch,
    placeholder = "Access the timeline..."
}) => {
    const [value, setValue] = useState('');

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            onSearch?.(value);
        }
    };

    return (
        <div className="rf-floating-search">
            <div className="rf-floating-search__container">
                <span className="rf-floating-search__icon">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M10.68 11.74a6 6 0 0 1-7.922-8.98 6 6 0 0 1 8.98 7.922l3.5 3.5a.75.75 0 0 1-1.06 1.06l-3.5-3.5ZM11.25 7a4.25 4.25 0 1 1-8.5 0 4.25 4.25 0 0 1 8.5 0Z" />
                    </svg>
                </span>
                <input 
                    type="text" 
                    className="rf-floating-search__input" 
                    placeholder={placeholder}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                />
                <span className="rf-floating-search__shortcut">/</span>
            </div>
        </div>
    );
};