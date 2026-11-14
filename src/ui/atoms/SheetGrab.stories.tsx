import type { Meta, StoryObj } from "@storybook/react";
import { SheetGrab } from "./SheetGrab";

const meta = {
  title: "Atoms/SheetGrab",
  component: SheetGrab,
} satisfies Meta<typeof SheetGrab>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Visible: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "The grab handle only appears below 900 px. Forced visible here so the shape is documented.",
      },
    },
  },
  render: () => (
    <>
      <style>{".sheet-grab { display: block; }"}</style>
      <SheetGrab />
    </>
  ),
};
