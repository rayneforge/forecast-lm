import type { Meta, StoryObj } from '@storybook/react';
import { StoryStrip } from './StoryStrip';
import type { NewsArticle } from '@rayneforge/logic';
import './story-strip.scss';

const mockArticle: NewsArticle = {
    title: "NVIDIA announces new GPU architecture",
    source: { name: "TechCrunch", id: "techcrunch" },
    publishedAt: new Date().toISOString(),
    url: "#",
    tags: ["Hardware", "NVIDIA", "AI"]
};

const meta: Meta<typeof StoryStrip> = {
  title: 'Components/StoryStrip',
  component: StoryStrip,
  args: {
    article: mockArticle,
    state: 'collapsed'
  },
  argTypes: {
    state: {
      control: 'select',
      options: ['collapsed', 'peek', 'inspect']
    }
  }
};

export default meta;
type Story = StoryObj<typeof StoryStrip>;

export const Collapsed: Story = {};

export const Peek: Story = {
    args: {
        state: 'peek',
        article: { ...mockArticle, description: "The new Blackwell architecture offers 4x performance in inference tasks." }
    }
};

export const Inspect: Story = {
    args: {
        state: 'inspect',
        article: { 
            ...mockArticle, 
            description: "Full details about the new architecture, including memory bandwidth improvements and energy efficiency gains." 
        }
    }
};
