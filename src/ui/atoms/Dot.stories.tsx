import type { Meta, StoryObj } from "@storybook/react";
import { Dot } from "./Dot";
import { c } from "../styles/classes";

const meta = {
  title: "Atoms/Dot",
  component: Dot,
  args: { tone: "ok" },
  decorators: [
    (Story) => (
      <span className={c("room-status")}>
        <Story />
      </span>
    ),
  ],
} satisfies Meta<typeof Dot>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Ok: Story = {};

export const Warn: Story = {
  args: { tone: "warn" },
};

export const Off: Story = {
  args: { tone: "off" },
};

export const Muted: Story = {
  args: { tone: "muted" },
};
