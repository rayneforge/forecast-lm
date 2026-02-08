import type { Meta, StoryObj } from '@storybook/react';
import { PinnedBoard } from './PinnedBoard';
import type { NewsArticle } from '@rayneforge/logic';
import './pinned-board.scss';

const mockArticle: NewsArticle = {
    title: "Pinned Article Title",
    source: { name: "Source", id: "src" },
    publishedAt: new Date().toISOString(),
    url: "#"
};

const meta: Meta<typeof PinnedBoard> = {
  title: 'Components/PinnedBoard',
  component: PinnedBoard,
  args: {
    items: [
        { group: 'Read Later', item: { article: { ...mockArticle, title: "Deep Dive: Rust" }, note: "Check memory safety section" } },
        { group: 'Read Later', item: { article: { ...mockArticle, title: "WASM Future" } } },
        { group: 'Research', item: { article: { ...mockArticle, title: "Competitor Analysis" } } },
        { item: { article: { ...mockArticle, title: "Ungrouped Item" } } }
    ]
  }
};

export default meta;
type Story = StoryObj<typeof PinnedBoard>;

export const Default: Story = {};
export const Empty: Story = { args: { items: [] } };
