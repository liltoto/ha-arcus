import type { Meta, StoryObj } from "@storybook/react";
import { LightRow } from "./LightRow";

const meta = {
  title: "Molecules/LightRow",
  component: LightRow,
  args: {
    name: "Køkken",
    isOn: true,
    brightness: 64,
    onToggle: () => undefined,
    onBrightness: () => undefined,
  },
} satisfies Meta<typeof LightRow>;

export default meta;

type Story = StoryObj<typeof meta>;

export const On: Story = {};

export const Off: Story = {
  args: { isOn: false, brightness: 0 },
};

export const WithIcon: Story = {
  args: { icon: "light", name: "Spisebord", brightness: 22 },
};
