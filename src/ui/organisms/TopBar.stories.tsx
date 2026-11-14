import type { Meta, StoryObj } from "@storybook/react";
import { TopBar } from "./TopBar";

const meta = {
  title: "Home/TopBar",
  component: TopBar,
  parameters: {
    docs: {
      description: {
        component:
          "Brand, date, presence, alert, atmosphere, and menu controls. The atmosphere icon stays in React, so the card's legacy `_applyAtmo` never overwrites it.",
      },
    },
  },
  render: () => (
    <header className="topbar">
      <TopBar />
    </header>
  ),
} satisfies Meta<typeof TopBar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
