import type { Meta, StoryObj } from '@storybook/react';
import { Chip } from './Chip';
import './chip.scss';

const meta: Meta<typeof Chip> = {
  title: 'Primitives/Chip',
  component: Chip,
  args: {
    label: 'Technology',
    variant: 'neutral'
  },
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['neutral', 'entity', 'topic', 'filter', 'active']
    }
  }
};

export default meta;
type Story = StoryObj<typeof Chip>;

export const Default: Story = {};
export const Entity: Story = { args: { variant: 'entity', label: 'Microsoft' } };
export const Topic: Story = { args: { variant: 'topic', label: 'AI Models' } };
export const Active: Story = { args: { variant: 'active', label: 'Selected' } };
