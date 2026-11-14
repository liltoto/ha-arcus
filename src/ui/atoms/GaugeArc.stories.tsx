import type { Meta, StoryObj } from "@storybook/react";
import { GaugeArc } from "./GaugeArc";

const meta = {
  title: "Atoms/GaugeArc",
  component: GaugeArc,
  args: { value: 64, size: 120 },
} satisfies Meta<typeof GaugeArc>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Sage: Story = {};

export const Brass: Story = {
  args: { tone: "brass", value: 82 },
};

export const Coral: Story = {
  args: { tone: "coral", value: 28 },
};

export const Empty: Story = {
  args: { value: 0 },
};
