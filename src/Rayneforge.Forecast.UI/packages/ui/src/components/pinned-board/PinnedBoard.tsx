import React from 'react';
import { PinnedItem, PinnedItemProps } from './PinnedItem';
import './pinned-board.scss';

export interface PinnedBoardProps {
    items: {
        group?: string;
        item: PinnedItemProps;
    }[];
}

export const PinnedBoard: React.FC<PinnedBoardProps> = ({ items }) => {
    // Grouping Logic
    const groups: { [key: string]: PinnedItemProps[] } = {};
    const ungrouped: PinnedItemProps[] = [];

    items.forEach(i => {
        if (i.group) {
            groups[i.group] = groups[i.group] || [];
            groups[i.group].push(i.item);
        } else {
            ungrouped.push(i.item);
        }
    });

    return (
        <aside className="rf-pinned-board">
            <header className="rf-pinned-board__header">
                <span className="rf-pinned-board__title">Pinned Items</span>
                <span className="rf-pinned-board__count">{items.length}</span>
            </header>

            <div className="rf-pinned-board__content">
                {Object.entries(groups).map(([name, groupItems]) => (
                    <div className="rf-pin-group" key={name}>
                        <div className="rf-pin-group__header">
                            {name} ({groupItems.length})
                        </div>
                        <div className="rf-pin-group__list">
                            {groupItems.map((itemProps, idx) => (
                                <PinnedItem key={`${name}-${idx}`} {...itemProps} />
                            ))}
                        </div>
                    </div>
                ))}

                {ungrouped.length > 0 && (
                    <div className="rf-pin-group__list">
                        {ungrouped.map((itemProps, idx) => (
                            <PinnedItem key={`ungrouped-${idx}`} {...itemProps} />
                        ))}
                    </div>
                )}
            </div>
        </aside>
    );
};
