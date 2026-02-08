import type { Meta, StoryObj } from '@storybook/html';
import { createNewsCard } from './news-card'; // Relative to the file location in packages/ui
import { NewsArticle } from '@rayneforge/logic';
import './news-card.scss';

const meta: Meta = {
  title: 'Components/NewsCard',
  render: (args) => {
    return createNewsCard(args.article as NewsArticle);
  },
  args: {
    article: {
        title: "Micro-optimization in .NET 9",
        description: "How the latest runtime improves LINQ performance by 20%.",
        source: { name: "DotNet Blog", id: "ms-blog" },
        publishedAt: new Date().toISOString(),
        url: "#",
        imageUrl: "https://placehold.co/600x400"
    } as NewsArticle
  }
};

export default meta;
type Story = StoryObj;

export const Default: Story = {};

export const WithImage: Story = {
    args: {
        article: {
             title: "Visual AI breakthrough",
             description: "New models can see better than humans.",
             source: { name: "AI Weekly" },
             publishedAt: new Date().toISOString(),
             url: "#",
             imageUrl: "https://placehold.co/600x400/3b82f6/white?text=AI+Result"
        }
    }
};

export const TextOnly: Story = {
    args: {
        article: {
             title: "Simple Announcement",
             description: "Nothing to see here image-wise.",
             source: { name: "Plain Text" },
             publishedAt: new Date().toISOString(),
             url: "#",
        }
    }
};
