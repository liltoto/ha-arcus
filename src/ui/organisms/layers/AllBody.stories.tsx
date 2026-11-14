import type { Meta, StoryObj } from "@storybook/react";
import { storyApp } from "../../providers/StoryProviders";
import { AllBody } from "./AllBody";

const meta = {
  title: "Sheets/All",
  component: AllBody,
  args: {
    app: storyApp,
    route: { base: "alle", sub: null },
  },
  render: (args) => (
    <div
      className="sheet open"
      style={{
        position: "relative",
        height: "90vh",
        width: "min(590px, 100%)",
        margin: "0 auto",
        transform: "none",
      }}
    >
      <AllBody {...args} />
    </div>
  ),
} satisfies Meta<typeof AllBody>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
