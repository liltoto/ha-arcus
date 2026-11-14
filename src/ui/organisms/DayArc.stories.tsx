import type { Meta, StoryObj } from "@storybook/react";
import { DayArc } from "./DayArc";

/**
 * The arc renders as an empty skeleton here: the card's `_refreshArc()` fills
 * the paths and labels once the dashboard mounts in Home Assistant.
 */
const meta = {
  title: "Home/DayArc",
  component: DayArc,
} satisfies Meta<typeof DayArc>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
