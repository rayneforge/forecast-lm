import type { Meta, StoryObj } from '@storybook/react';
import { NewsCard } from './NewsCard';
import type { NewsArticle } from '@rayneforge/logic';
import './news-card.scss';

const mockArticle: NewsArticle = {
    title: "Micro-optimization in .NET 9",
    description: "How the latest runtime improves LINQ performance by 20%.",
    source: { name: "DotNet Blog", id: "ms-blog" },
    publishedAt: new Date().toISOString(),
    url: "#",
    imageUrl: "https://placehold.co/600x400"
};

const meta: Meta<typeof NewsCard> = {
  title: 'Components/NewsCard',
  component: NewsCard,
  args: {
    article: mockArticle
  }
};

export default meta;
type Story = StoryObj<typeof NewsCard>;

export const Default: Story = {};

export const NoImage: Story = {
    args: {
        article: { ...mockArticle, imageUrl: undefined }
    }
};
