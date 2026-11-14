import type { Meta, StoryObj } from "@storybook/react";
import { ZoneStrip } from "./ZoneStrip";

const meta = {
  title: "Molecules/ZoneStrip",
  component: ZoneStrip,
  args: {
    values: [42, 58, 71, 49, 63],
    warns: [false, false, false, false, false],
  },
  render: (args) => (
    <div style={{ maxWidth: 360 }}>
      <ZoneStrip {...args} />
    </div>
  ),
} satisfies Meta<typeof ZoneStrip>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithWarning: Story = {
  args: { warns: [false, true, false, true, false] },
};

export const Ventilation: Story = {
  args: { values: [20, 36, 52, 68, 84], warns: undefined },
};
