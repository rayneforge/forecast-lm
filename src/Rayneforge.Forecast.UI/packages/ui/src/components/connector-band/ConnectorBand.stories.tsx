import type { Meta, StoryObj } from '@storybook/react';
import { ConnectorBand } from './ConnectorBand';
import './connector-band.scss';

const meta: Meta<typeof ConnectorBand> = {
  title: 'Primitives/ConnectorBand',
  component: ConnectorBand,
  args: {
    label: 'Shared Topic',
    variant: 'shared-topics',
    chips: ['Finance', 'Economy']
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['shared-topics', 'timeline-link', 'semantic-neighbor']
    }
  }
};

export default meta;
type Story = StoryObj<typeof ConnectorBand>;

export const SharedTopics: Story = {};

export const TimelineLink: Story = {
    args: {
        label: 'Related Event',
        variant: 'timeline-link',
        chips: []
    }
};

export const SemanticNeighbor: Story = {
    args: {
        label: 'Similar Context',
        variant: 'semantic-neighbor',
        chips: ['Market Crash', 'Recession']
    }
};
