import type { Meta, StoryObj } from "@storybook/react";
import { Icon } from "./Icon";

const meta = {
  title: "Atoms/Icon",
  component: Icon,
  args: { name: "sun" },
} satisfies Meta<typeof Icon>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Sun: Story = {};

export const Moon: Story = {
  args: { name: "moon" },
};

export const WithTitle: Story = {
  args: { name: "info", title: "Information" },
};

export const Unknown: Story = {
  args: { name: "does-not-exist" },
};
