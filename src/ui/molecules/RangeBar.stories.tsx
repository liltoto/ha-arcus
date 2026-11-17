import type { Meta, StoryObj } from "@storybook/react";
import { createTranslator } from "../../localize";
import { defaultRange, resolveRange } from "../../range";
import { RangeBar } from "./RangeBar";

const now = new Date("2026-11-17T14:00:00+01:00");
const range = resolveRange(defaultRange(now), now);

const meta = {
  title: "Molecules/RangeBar",
  component: RangeBar,
  args: {
    range,
    t: createTranslator("da"),
    language: "da",
    now,
    onStep: () => undefined,
    onDays: () => undefined,
    onAnchor: () => undefined,
    onToday: () => undefined,
  },
  render: (args) => (
    <div style={{ maxWidth: 720, padding: "12px 0" }}>
      <RangeBar {...args} />
    </div>
  ),
} satisfies Meta<typeof RangeBar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Home: Story = {};

export const PastDay: Story = {
  args: {
    range: resolveRange(
      { anchor: new Date(2026, 10, 10).setHours(0, 0, 0, 0), days: 1 },
      now,
    ),
  },
};

export const Week: Story = {
  args: {
    range: resolveRange(
      { anchor: new Date(2026, 10, 17).setHours(0, 0, 0, 0), days: 7 },
      now,
    ),
  },
};

export const Sheet: Story = {
  args: { variant: "sheet" },
  render: (args) => (
    <div
      style={{
        maxWidth: 590,
        margin: "0 auto",
        background: "var(--bg-1)",
        border: "1px solid var(--line-strong)",
        borderRadius: 24,
        overflow: "hidden",
      }}
    >
      <RangeBar {...args} />
    </div>
  ),
};
