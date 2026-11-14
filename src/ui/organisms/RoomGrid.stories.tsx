import type { Meta, StoryObj } from "@storybook/react";
import { RoomGrid } from "./RoomGrid";

const meta = {
  title: "Home/RoomGrid",
  component: RoomGrid,
  render: () => (
    <section className="section">
      <RoomGrid />
    </section>
  ),
} satisfies Meta<typeof RoomGrid>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
