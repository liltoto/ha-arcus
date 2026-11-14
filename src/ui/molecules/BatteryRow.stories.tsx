import type { Meta, StoryObj } from "@storybook/react";
import { BatteryRow } from "./BatteryRow";

const meta = {
  title: "Molecules/BatteryRow",
  component: BatteryRow,
  args: {
    name: "Hoveddør",
    value: 84,
    sub: "Sidst skiftet i maj",
  },
  render: (args) => (
    <div className="battery-list" style={{ maxWidth: 620 }}>
      <BatteryRow {...args} />
    </div>
  ),
} satisfies Meta<typeof BatteryRow>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Healthy: Story = {};

export const Mid: Story = {
  args: { name: "Bagdør", value: 32, sub: "Skift snart" },
};

export const Low: Story = {
  args: { name: "Vindueskontakt", value: 12, sub: "Skift nu" },
};
