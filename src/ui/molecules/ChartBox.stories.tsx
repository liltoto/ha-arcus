import type { Meta, StoryObj } from "@storybook/react";
import { ChartBox } from "./ChartBox";

const chart = (
  <svg viewBox="0 0 560 120" preserveAspectRatio="none" aria-hidden="true">
    <path
      d="M0 92 L80 78 L160 86 L240 52 L320 60 L400 28 L480 38 L560 18"
      fill="none"
      stroke="var(--amber)"
      strokeWidth="1.5"
    />
  </svg>
);

const meta = {
  title: "Molecules/ChartBox",
  component: ChartBox,
  args: {
    title: "Solproduktion",
    caption: <span>24 timer</span>,
    children: chart,
  },
  render: (args) => (
    <div style={{ maxWidth: 720 }}>
      <ChartBox {...args} />
    </div>
  ),
} satisfies Meta<typeof ChartBox>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Ready: Story = {};

export const Empty: Story = {
  args: {
    state: "empty",
    emptyLabel: "Ingen historik endnu",
  },
};

export const Loading: Story = {
  args: {
    state: "loading",
    loadingLabel: "Indlæser historik…",
  },
};

export const Unavailable: Story = {
  args: {
    state: "unavailable",
    unavailableLabel: "Utilgængelig",
  },
};

export const WithoutCaption: Story = {
  args: { title: undefined, caption: undefined },
};
