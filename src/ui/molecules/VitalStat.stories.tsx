import type { Meta, StoryObj } from "@storybook/react";
import { VitalStat } from "./VitalStat";

const meta = {
  title: "Molecules/VitalStat",
  component: VitalStat,
  args: {
    label: "Indendørs",
    value: "21.4",
    unit: "°C",
    sub: "Behageligt",
    spark: [20.1, 20.4, 20.8, 21.1, 21.4],
    onClick: () => undefined,
  },
} satisfies Meta<typeof VitalStat>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Price: Story = {
  args: {
    label: "Pris nu",
    value: "1,84",
    unit: "kr",
    sub: "pr. kWh",
    sparkColor: "var(--brass)",
    spark: [1.62, 1.7, 1.91, 1.84, 1.75],
  },
};

export const BatteryRing: Story = {
  args: {
    label: "Batteri",
    value: "72",
    unit: "%",
    sub: "Oplader",
    spark: undefined,
    sparkColor: "var(--sage)",
    ring: (
      <svg viewBox="0 0 40 40">
        <circle
          cx="20"
          cy="20"
          r="16"
          fill="none"
          stroke="var(--line)"
          strokeWidth="2.5"
        />
        <circle
          cx="20"
          cy="20"
          r="16"
          fill="none"
          stroke="var(--sage)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="100.5"
          strokeDashoffset="28"
          transform="rotate(-90 20 20)"
        />
      </svg>
    ),
  },
};

export const Static: Story = {
  args: { onClick: undefined, sub: undefined },
};
