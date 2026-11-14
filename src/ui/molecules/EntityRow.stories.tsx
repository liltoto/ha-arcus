import type { Meta, StoryObj } from "@storybook/react";
import { EntityRow } from "./EntityRow";

const meta = {
  title: "Molecules/EntityRow",
  component: EntityRow,
  args: {
    name: "Køkkenlampe",
    sub: "Loft · 40 %",
    icon: "light",
    value: "40",
    unit: "%",
    onClick: () => undefined,
  },
} satisfies Meta<typeof EntityRow>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithTrailing: Story = {
  args: {
    name: "Router",
    sub: "Stue · online",
    icon: "network",
    value: undefined,
    trailing: <span className="row-val">12 ms</span>,
  },
};

export const Active: Story = {
  args: {
    name: "Vinduesalarm",
    sub: "Sender notifikation",
    icon: "wind",
    value: "Til",
    on: true,
    unit: undefined,
  },
};

export const Static: Story = {
  args: { onClick: undefined, name: "Stue", sub: "Ophold", icon: "sofa" },
};
