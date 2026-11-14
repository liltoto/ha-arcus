import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./Button";

const meta = {
  title: "Atoms/Button",
  component: Button,
  args: {
    children: "Turn on",
  },
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Primary: Story = {
  args: { tone: "primary" },
};

export const Danger: Story = {
  args: { tone: "danger" },
};

export const Small: Story = {
  args: { size: "sm" },
};

export const Disabled: Story = {
  args: { disabled: true },
};
