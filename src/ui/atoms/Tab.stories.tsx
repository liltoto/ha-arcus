import type { Meta, StoryObj } from "@storybook/react";
import { Tab } from "./Tab";
import { c } from "../styles/classes";

const meta = {
  title: "Atoms/Tab",
  component: Tab,
  args: {
    children: "Lights",
    active: false,
    onClick: () => undefined,
  },
} satisfies Meta<typeof Tab>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Active: Story = {
  args: { active: true },
};

export const Group: Story = {
  render: (args) => (
    <div className={c("sheet-tabs")}>
      <Tab {...args}>All</Tab>
      <Tab {...args} active>
        Lights
      </Tab>
      <Tab {...args}>Energy</Tab>
    </div>
  ),
};
