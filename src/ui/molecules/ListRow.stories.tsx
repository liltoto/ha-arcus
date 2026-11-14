import type { Meta, StoryObj } from "@storybook/react";
import { ListRow } from "./ListRow";

const meta = {
  title: "Molecules/ListRow",
  component: ListRow,
  args: {
    name: "Router",
    sub: "Stue · online",
    icon: "network",
    value: "12",
    unit: "ms",
  },
  render: (args) => (
    <div className="list" style={{ maxWidth: 620 }}>
      <ListRow {...args} />
    </div>
  ),
} satisfies Meta<typeof ListRow>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Active: Story = {
  args: {
    name: "Udsugning",
    sub: "Kører",
    icon: "fan",
    value: "Trin 2",
    unit: undefined,
    on: true,
  },
};

export const Clickable: Story = {
  args: {
    name: "Alle rum",
    sub: "Se hele huset",
    icon: "home",
    value: undefined,
    onClick: () => undefined,
  },
};

export const WithoutIcon: Story = {
  args: { name: "Cloudflare", value: "24", unit: "ms", icon: undefined },
};
