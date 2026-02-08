import type { Meta, StoryObj } from '@storybook/react';
import { NewsFeedPage } from '../pages/NewsFeedPage';
import { NewsArticle } from '@rayneforge/logic';

const mockArticle: NewsArticle = {
    title: "Global Markets Rally",
    description: "Stocks hit record highs as inflation data cools better than expected.",
    source: { name: "Financial Times", id: "ft" },
    publishedAt: new Date().toISOString(),
    url: "#",
    imageUrl: "https://placehold.co/600x400",
    tags: ["Markets", "Economy"]
};

const meta: Meta<typeof NewsFeedPage> = {
    title: 'Pages/NewsFeed',
    component: NewsFeedPage,
    parameters: {
        layout: 'fullscreen',
    },
    args: {
        isLensOpen: true,
        articles: Array(6).fill(mockArticle).map((a, i) => ({ ...a, title: `${a.title} ${i + 1}` })),
        filters: [
            {
                title: 'Data Sources',
                type: 'checkbox',
                options: [
                    { label: 'Verified News', count: 120, active: true },
                    { label: 'Social Media', count: 450 }
                ]
            }
        ],
        pinnedItems: [
            { group: 'Watchlist', item: { article: { ...mockArticle, title: "Competitor Earnings" }, note: "Releases tomorrow" } }
        ]
    }
};

export default meta;
type Story = StoryObj<typeof NewsFeedPage>;

export const Default: Story = {};
