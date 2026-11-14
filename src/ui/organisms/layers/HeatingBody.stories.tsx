import type { Meta, StoryObj } from "@storybook/react";
import type { ArcusRoute } from "../../types";
import { withSheet } from "../../storybook/with-sheet";
import { HeatingBody } from "./HeatingBody";

const route: ArcusRoute = { base: "varme", sub: null };

const meta = {
  title: "Sheets/Heating",
  component: HeatingBody,
  decorators: [withSheet("page")],
  args: {
    route,
  },
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof HeatingBody>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
