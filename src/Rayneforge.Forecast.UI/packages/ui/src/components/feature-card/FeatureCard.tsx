import React from 'react';
import './feature-card.scss';

export interface FeatureCardProps {
    /** Icon character or emoji rendered in the accent circle */
    icon: React.ReactNode;
    /** Card heading */
    title: string;
    /** Short description */
    description: string;
    /** Optional extra class names */
    className?: string;
}

export const FeatureCard: React.FC<FeatureCardProps> = ({
    icon,
    title,
    description,
    className,
}) => {
    return (
        <div className={`rf-feature-card${className ? ` ${className}` : ''}`}>
            <span className="rf-feature-card__icon">{icon}</span>
            <h3 className="rf-feature-card__title">{title}</h3>
            <p className="rf-feature-card__desc">{description}</p>
        </div>
    );
};
