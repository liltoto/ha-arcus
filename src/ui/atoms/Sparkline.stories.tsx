import type { Meta, StoryObj } from "@storybook/react";
import { Sparkline } from "./Sparkline";

const values = [12, 14, 11, 16, 18, 17, 21, 20, 24, 22, 25, 23];

const meta = {
  title: "Atoms/Sparkline",
  component: Sparkline,
  args: { values },
} satisfies Meta<typeof Sparkline>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Line: Story = {};

export const Area: Story = {
  args: { area: true },
};

export const WithGaps: Story = {
  args: { values: [12, 14, null, 18, 17, null, 24, 22] },
};

export const Empty: Story = {
  args: { values: [] },
};
