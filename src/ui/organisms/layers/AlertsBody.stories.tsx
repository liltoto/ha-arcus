import type { Meta, StoryObj } from "@storybook/react";
import { storyApp } from "../../providers/StoryProviders";
import { AlertsBody } from "./AlertsBody";

const meta = {
  title: "Sheets/Alerts",
  component: AlertsBody,
  args: {
    app: storyApp,
    route: { base: "alarmer", sub: null },
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
      <AlertsBody {...args} />
    </div>
  ),
} satisfies Meta<typeof AlertsBody>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
