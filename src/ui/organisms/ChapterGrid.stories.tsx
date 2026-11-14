import type { Meta, StoryObj } from "@storybook/react";
import { ChapterGrid } from "./ChapterGrid";

const meta = {
  title: "Home/ChapterGrid",
  component: ChapterGrid,
} satisfies Meta<typeof ChapterGrid>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The real fixture enables all ten chapters, including the alert tile. */
export const Default: Story = {};
