import type { Meta, StoryObj } from "@storybook/react";
import { withSheet } from "../../storybook/with-sheet";
import { WaterBody } from "./WaterBody";

const meta = {
  title: "Sheets/Water",
  component: WaterBody,
  decorators: [withSheet("fill")],
  parameters: { layout: "fullscreen" },
  args: {
    route: { base: "vand", sub: null },
  },
} satisfies Meta<typeof WaterBody>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
