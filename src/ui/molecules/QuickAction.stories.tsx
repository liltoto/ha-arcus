import type { Meta, StoryObj } from "@storybook/react";
import { QuickAction } from "./QuickAction";

const meta = {
  title: "Molecules/QuickAction",
  component: QuickAction,
  args: {
    icon: "moon",
    label: "Godnat",
    on: false,
    onClick: () => undefined,
  },
} satisfies Meta<typeof QuickAction>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Active: Story = {
  args: { icon: "car", label: "Ferie", on: true },
};

export const Navigation: Story = {
  args: { icon: "light", label: "Lys", on: false },
};

export const Map: Story = {
  args: { icon: "map", label: "Kort", on: false },
};
