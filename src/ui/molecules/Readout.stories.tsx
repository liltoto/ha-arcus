import type { Meta, StoryObj } from "@storybook/react";
import { Readout } from "./Readout";

const meta = {
  title: "Molecules/Readout",
  component: Readout,
  args: {
    label: "Indendørs",
    value: "21,4",
    unit: "°C",
  },
  render: (args) => (
    <div className="readings" style={{ maxWidth: 320 }}>
      <Readout {...args} />
    </div>
  ),
} satisfies Meta<typeof Readout>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Unitless: Story = {
  args: { label: "Fugtighed", value: "48", unit: undefined },
};

export const Status: Story = {
  args: { label: "Tilstand", value: "Lukket", unit: undefined },
};
