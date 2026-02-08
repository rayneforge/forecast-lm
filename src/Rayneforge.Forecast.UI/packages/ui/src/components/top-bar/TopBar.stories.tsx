import type { Meta, StoryObj } from '@storybook/react';
import { TopBar } from './TopBar';
import './top-bar.scss';

const meta: Meta<typeof TopBar> = {
  title: 'Layout/TopBar',
  component: TopBar,
  parameters: {
      layout: 'fullscreen'
  },
  args: {
    title: 'Rayneforge',
    showSearch: true
  }
};

export default meta;
type Story = StoryObj<typeof TopBar>;

export const Default: Story = {};
export const NoSearch: Story = { args: { showSearch: false } };
