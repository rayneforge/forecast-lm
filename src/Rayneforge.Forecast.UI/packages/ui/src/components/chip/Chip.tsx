import React from 'react';

export interface ChipProps {
    label: string;
    variant?: 'entity' | 'topic' | 'filter' | 'neutral' | 'active';
}

export const Chip: React.FC<ChipProps> = ({ label, variant = 'neutral' }) => {
    return (
        <span className={`rf-chip rf-chip--${variant}`}>
            {label}
        </span>
    );
};
