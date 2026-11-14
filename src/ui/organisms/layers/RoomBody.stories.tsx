import type { Meta, StoryObj } from "@storybook/react";
import { RoomBody } from "./RoomBody";

/**
 * The global fixture decorator supplies the real home and the story frame
 * supplies the card's shadow-root cascade; only the route selects a room.
 */
const meta = {
  title: "Sheets/Room",
  component: RoomBody,
  args: {
    route: { base: "rum", sub: "stue" },
  },
} satisfies Meta<typeof RoomBody>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Stue: Story = {};

export const Skur: Story = {
  args: {
    route: { base: "skur", sub: null },
  },
};
