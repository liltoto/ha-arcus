import type { Meta, StoryObj } from "@storybook/react";
import { OpeningRow } from "./OpeningRow";

const meta = {
  title: "Molecules/OpeningRow",
  component: OpeningRow,
  args: {
    name: "Køkkenvindue",
    kind: "Vindue",
    room: "Køkken",
    icon: "wind",
    isOpen: false,
    onClick: () => undefined,
  },
  render: (args) => (
    <div className="list" style={{ maxWidth: 620 }}>
      <OpeningRow {...args} />
    </div>
  ),
} satisfies Meta<typeof OpeningRow>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Closed: Story = {};

export const Open: Story = {
  args: {
    isOpen: true,
    name: "Terrassedør",
    kind: "Dør",
    room: "Stue",
    icon: "door",
  },
};

export const Leak: Story = {
  args: {
    isOpen: true,
    name: "Vandlækage",
    kind: "Lækage",
    room: "Bryggers",
    icon: "drop",
    status: "Alarm",
  },
};
