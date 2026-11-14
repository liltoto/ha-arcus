import type { Meta, StoryObj } from "@storybook/react";
import { SegmentedTabs } from "./SegmentedTabs";

const tabs = [
  { key: "overblik", label: "Overblik" },
  { key: "historik", label: "Historik" },
  { key: "batteri", label: "Batteri" },
  { key: "økonomi", label: "Økonomi" },
];

const meta = {
  title: "Molecules/SegmentedTabs",
  component: SegmentedTabs,
  args: {
    tabs,
    active: "overblik",
    onChange: () => undefined,
  },
  render: (args) => (
    <div style={{ maxWidth: 720 }}>
      <SegmentedTabs {...args} />
    </div>
  ),
} satisfies Meta<typeof SegmentedTabs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Overview: Story = {};

export const History: Story = {
  args: { active: "historik" },
};

export const ManyTabs: Story = {
  args: {
    active: "batteri",
    tabs: [
      ...tabs,
      { key: "sol", label: "Sol" },
      { key: "net", label: "Net" },
      { key: "hus", label: "Hus" },
      { key: "bil", label: "Bil" },
    ],
  },
};
