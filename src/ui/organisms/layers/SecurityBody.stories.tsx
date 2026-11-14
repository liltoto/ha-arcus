import type { Meta, StoryObj } from "@storybook/react";
import type { ArcusRoute } from "../../types";
import { storyApp } from "../../providers/StoryProviders";
import { SecurityBody } from "./SecurityBody";

const route: ArcusRoute = { base: "sikkerhed", sub: null };

const meta = {
  title: "Sheets/Security",
  component: SecurityBody,
  args: {
    app: storyApp,
    route,
  },
  parameters: { layout: "fullscreen" },
  render: (args) => (
    <div
      style={{
        minHeight: "100vh",
        padding: 24,
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div
        className="sheet open"
        style={{
          position: "relative",
          inset: "auto",
          width: "min(590px, 100%)",
          height: "min(880px, calc(100vh - 48px))",
          transform: "none",
          borderRadius: 24,
        }}
      >
        <SecurityBody {...args} />
      </div>
    </div>
  ),
} satisfies Meta<typeof SecurityBody>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
