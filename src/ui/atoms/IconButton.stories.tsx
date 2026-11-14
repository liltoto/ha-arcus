import type { Meta, StoryObj } from "@storybook/react";
import { IconButton } from "./IconButton";

const meta = {
  title: "Atoms/IconButton",
  component: IconButton,
  args: {
    icon: "close",
    label: "Close",
  },
} satisfies Meta<typeof IconButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Settings: Story = {
  args: { icon: "menu", label: "Open menu" },
};

export const WithAction: Story = {
  args: { icon: "moon", label: "Atmosphere", dataAct: "atmo" },
};

export const Disabled: Story = {
  args: { disabled: true },
};
