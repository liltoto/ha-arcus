import type { Meta, StoryObj } from "@storybook/react";
import { Badge } from "./Badge";

const meta = {
  title: "Atoms/Badge",
  component: Badge,
  args: { children: "Stue" },
} satisfies Meta<typeof Badge>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Warn: Story = {
  args: { children: "2 alarmer", tone: "warn" },
};

export const Danger: Story = {
  args: { children: "Utæthed", tone: "danger" },
};

export const Ok: Story = {
  args: { children: "Alt vel", tone: "ok" },
};
