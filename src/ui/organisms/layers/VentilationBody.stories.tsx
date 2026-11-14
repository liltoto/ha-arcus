import type { Meta, StoryObj } from "@storybook/react";
import { withSheet } from "../../storybook/with-sheet";
import { VentilationBody } from "./VentilationBody";

const meta = {
  title: "Sheets/Ventilation",
  component: VentilationBody,
  decorators: [withSheet("fill")],
  parameters: { layout: "fullscreen" },
  args: {
    route: { base: "ventilation", sub: null },
  },
} satisfies Meta<typeof VentilationBody>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
