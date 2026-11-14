import type { Meta, StoryObj } from "@storybook/react";
import { Vitals } from "./Vitals";

const meta = {
  title: "Home/Vitals",
  component: Vitals,
} satisfies Meta<typeof Vitals>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
