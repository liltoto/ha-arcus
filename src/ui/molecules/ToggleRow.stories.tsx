import type { Meta, StoryObj } from "@storybook/react";
import { ToggleRow } from "./ToggleRow";

const meta = {
  title: "Molecules/ToggleRow",
  component: ToggleRow,
  args: {
    label: "Vinduesalarm",
    sub: "Notifikation når et vindue åbnes",
    isOn: false,
    onChange: () => undefined,
  },
} satisfies Meta<typeof ToggleRow>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Off: Story = {};

export const On: Story = {
  args: { isOn: true },
};

export const WithIcon: Story = {
  args: {
    icon: "wind",
    label: "Udsugning",
    sub: "Kører automatisk",
    isOn: true,
  },
};

export const Disabled: Story = {
  args: { isOn: true, disabled: true },
};
