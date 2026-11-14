import type { Meta, StoryObj } from "@storybook/react";
import { EmptyState } from "./EmptyState";

const meta = {
  title: "Atoms/EmptyState",
  component: EmptyState,
  args: {
    icon: "home",
    title: "No areas yet",
    hint: "Add an area in Home Assistant to see it here.",
  },
} satisfies Meta<typeof EmptyState>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithoutIcon: Story = {
  args: { icon: undefined },
};

export const WithoutHint: Story = {
  args: { hint: undefined, title: "Nothing to show" },
};

export const Data: Story = {
  args: {
    icon: "chart",
    title: "No history yet",
    hint: "Data appears once the sensors have reported.",
  },
};
