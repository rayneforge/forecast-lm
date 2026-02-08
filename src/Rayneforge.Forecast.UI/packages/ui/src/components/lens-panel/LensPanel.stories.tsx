import type { Meta, StoryObj } from '@storybook/react';
import { LensPanel } from './LensPanel';
import './lens-panel.scss';

const meta: Meta<typeof LensPanel> = {
  title: 'Layout/LensPanel',
  component: LensPanel,
  parameters: {
      layout: 'fullscreen'
  },
  args: {
    isOpen: true,
    filters: [
        {
            title: 'Sources',
            type: 'checkbox',
            options: [
                { label: 'Reuters', count: 42, active: true },
                { label: 'Bloomberg', count: 12 },
                { label: 'TechCrunch', count: 5 }
            ]
        },
        {
            title: 'Sentiment',
            type: 'checkbox',
            options: [
                { label: 'Positive', count: 15 },
                { label: 'Negative', count: 3 }
            ]
        }
    ]
  }
};

export default meta;
type Story = StoryObj<typeof LensPanel>;

export const Open: Story = {};
export const Closed: Story = { args: { isOpen: false } };
