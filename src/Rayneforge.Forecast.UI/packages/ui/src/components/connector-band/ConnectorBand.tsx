import React from 'react';
import { Chip } from '../chip/Chip';
import './connector-band.scss';

export interface ConnectorBandProps {
    label: string;
    chips?: string[];
    variant?: 'shared-topics' | 'timeline-link' | 'semantic-neighbor';
}

export const ConnectorBand: React.FC<ConnectorBandProps> = ({ 
    label, 
    chips = [], 
    variant = 'shared-topics' 
}) => {
    return (
        <div className={`rf-connector-band rf-connector-band--${variant}`}>
            <div className="rf-connector-band__content">
                <span className="rf-connector-band__label">{label}</span>
                {chips.length > 0 && (
                    <div className="rf-connector-band__chips">
                        {chips.map((chipLabel, index) => (
                            <Chip key={`${chipLabel}-${index}`} label={chipLabel} variant="topic" />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
