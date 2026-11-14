import type { Meta, StoryObj } from "@storybook/react";
import { SheetHeader } from "./SheetHeader";

const meta = {
  title: "Molecules/SheetHeader",
  component: SheetHeader,
  args: {
    kicker: "Forbrug",
    title: "Energi",
    sum: "2,4 kWh i dag · 1,84 kr/kWh lige nu",
    onClose: () => undefined,
  },
  render: (args) => (
    <div style={{ maxWidth: 720 }}>
      <SheetHeader {...args} />
    </div>
  ),
} satisfies Meta<typeof SheetHeader>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithRichSummary: Story = {
  args: {
    kicker: "Sikkerhed",
    title: "Huset nu",
    sum: (
      <span>
        Alt lukket · <b>ingen lækager</b>
      </span>
    ),
  },
};

export const WithoutSummary: Story = {
  args: { sum: undefined, kicker: "Rytme", title: "Bønner" },
};
