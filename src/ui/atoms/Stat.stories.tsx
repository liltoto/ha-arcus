import type { Meta, StoryObj } from "@storybook/react";
import { Stat } from "./Stat";

const meta = {
  title: "Atoms/Stat",
  component: Stat,
  args: {
    label: "Indoor",
    value: "21.4",
    unit: "°C",
    sub: "Comfortable",
  },
} satisfies Meta<typeof Stat>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Ok: Story = {
  args: { tone: "ok", sub: "Stable all day" },
};

export const Warn: Story = {
  args: { tone: "warn", label: "Humidity", value: "68", unit: "%" },
};

export const WithoutSub: Story = {
  args: { sub: undefined, label: "Price", value: "1.84", unit: "kr" },
};
