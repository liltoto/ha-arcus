import type { Meta, StoryObj } from "@storybook/react";
import { Stepper } from "./Stepper";

const meta = {
  title: "Molecules/Stepper",
  component: Stepper,
  args: {
    label: "Temperatur",
    value: 21.5,
    min: 16,
    max: 26,
    step: 0.5,
    unit: "°C",
    onChange: () => undefined,
  },
} satisfies Meta<typeof Stepper>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const AtMinimum: Story = {
  args: { value: 16 },
};

export const AtMaximum: Story = {
  args: { value: 26 },
};

export const WholeDegrees: Story = {
  args: { value: 22, step: 1 },
};
