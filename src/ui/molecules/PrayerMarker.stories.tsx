import type { Meta, StoryObj } from "@storybook/react";
import { PrayerMarker } from "./PrayerMarker";
import { c } from "../styles/classes";

const meta = {
  title: "Molecules/PrayerMarker",
  component: PrayerMarker,
  args: {
    name: "Maghrib",
    time: "16:42",
    next: true,
  },
  render: (args) => (
    <div className={c("prayer-list")}>
      <PrayerMarker {...args} />
    </div>
  ),
} satisfies Meta<typeof PrayerMarker>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Next: Story = {};

export const Past: Story = {
  args: { name: "Asr", time: "14:18", next: false },
};

export const LocalizedNext: Story = {
  args: { name: "Isha", time: "18:10", next: true, nextLabel: "Næste" },
};
