import type { Meta, StoryObj } from "@storybook/react";
import { QuickActions } from "./QuickActions";

/**
 * The organism reads the home fixture from the global provider decorator.
 * The fixture config defines five quick actions, so the default story shows
 * the configured row; an empty config falls back to the legacy defaults.
 */
const meta = {
  title: "Home/QuickActions",
  component: QuickActions,
} satisfies Meta<typeof QuickActions>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
