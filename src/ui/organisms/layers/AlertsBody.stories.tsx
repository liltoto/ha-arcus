import type { Meta, StoryObj } from "@storybook/react";
import { AlertsBody } from "./AlertsBody";
import { c } from "../../styles/classes";

const meta = {
  title: "Sheets/Alerts",
  component: AlertsBody,
  args: {
    route: { base: "alarmer", sub: null },
  },
  render: (args) => (
    <div
      className={c("sheet open")}
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
