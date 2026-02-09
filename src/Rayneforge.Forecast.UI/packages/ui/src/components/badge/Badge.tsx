import React from 'react';
import './badge.scss';

export interface BadgeProps {
    /** Text displayed inside the badge */
    label: string;
    /** Visual variant */
    variant?: 'accent' | 'neutral' | 'success' | 'warning';
    /** Optional extra class names */
    className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
    label,
    variant = 'accent',
    className,
}) => {
    return (
        <span
            className={`rf-badge rf-badge--${variant}${className ? ` ${className}` : ''}`}
        >
            {label}
        </span>
    );
};
