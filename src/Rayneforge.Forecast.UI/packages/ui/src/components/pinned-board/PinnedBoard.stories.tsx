import type { Meta, StoryObj } from '@storybook/react';
import { PinnedBoard } from './PinnedBoard';
import './pinned-board.scss';

const meta: Meta<typeof PinnedBoard> = {
  title: 'Components/PinnedBoard',
  component: PinnedBoard,
  args: {
    items: [
        { 
            group: 'Articles', 
            item: { 
                id: '1', 
                title: 'Deep Dive: Rust', 
                subtitle: 'Reuters', 
                itemType: 'Article', 
                note: 'Check memory safety section',
                subItems: [
                    { id: '4', title: 'Performance claim', subtitle: 'Claim', itemType: 'Claim' }
                ]
            } 
        },
        { group: 'Articles', item: { id: '2', title: 'WASM Future', subtitle: 'Bloomberg', itemType: 'Article' } },
        { group: 'Entities', item: { id: '3', title: 'Competitor Analysis', subtitle: 'Organization', itemType: 'Entity' } },
    ]
  }
};

export default meta;
type Story = StoryObj<typeof PinnedBoard>;

export const Default: Story = {};
export const Empty: Story = { args: { items: [] } };
