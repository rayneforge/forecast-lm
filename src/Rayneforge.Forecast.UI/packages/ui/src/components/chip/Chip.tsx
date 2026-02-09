import React from 'react';

export interface ChipProps {
    label: string;
    variant?: 'entity' | 'topic' | 'filter' | 'neutral' | 'active';
    onClick?: () => void;
}

export const Chip: React.FC<ChipProps> = ({ label, variant = 'neutral', onClick }) => {
    const cls = `rf-chip rf-chip--${variant}${onClick ? ' rf-chip--clickable' : ''}`;
    return (
        <span className={cls} onClick={onClick} role={onClick ? 'button' : undefined}>
            {label}
        </span>
    );
};
