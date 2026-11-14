import type { Meta, StoryObj } from "@storybook/react";
import { MediaRow } from "./MediaRow";

const meta = {
  title: "Molecules/MediaRow",
  component: MediaRow,
  args: {
    name: "Soundbar",
    state: "Spiller",
    isPlaying: true,
    onToggle: () => undefined,
  },
  render: (args) => (
    <div className="list" style={{ maxWidth: 620 }}>
      <MediaRow {...args} />
    </div>
  ),
} satisfies Meta<typeof MediaRow>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playing: Story = {};

export const Paused: Story = {
  args: { state: "Pause", isPlaying: false },
};

export const Off: Story = {
  args: { state: "Slukket", isPlaying: false, name: "Køkkenhøjttaler" },
};
