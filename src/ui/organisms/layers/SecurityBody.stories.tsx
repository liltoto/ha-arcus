import type { Meta, StoryObj } from "@storybook/react";
import type { ArcusRoute } from "../../types";
import { withSheet } from "../../storybook/with-sheet";
import { SecurityBody } from "./SecurityBody";

const route: ArcusRoute = { base: "sikkerhed", sub: null };

const meta = {
  title: "Sheets/Security",
  component: SecurityBody,
  decorators: [withSheet("page")],
  args: {
    route,
  },
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof SecurityBody>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
