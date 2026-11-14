import type { Meta, StoryObj } from "@storybook/react";
import { storyApp } from "../../providers/StoryProviders";
import { EnergyBody } from "./EnergyBody";

/**
 * The energy sheet reads the price model from the global home fixture. The
 * fixture has a full 24-hour curve, so the bar chart, cheapest window, live
 * readings, and list rows all render with real values.
 */
const meta = {
  title: "Sheets/Energy",
  component: EnergyBody,
  args: {
    app: storyApp,
    route: { base: "energi", sub: null },
  },
} satisfies Meta<typeof EnergyBody>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
