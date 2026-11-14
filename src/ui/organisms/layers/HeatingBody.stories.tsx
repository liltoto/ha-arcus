import type { Meta, StoryObj } from "@storybook/react";
import type { ArcusRoute } from "../../types";
import { HeatingBody } from "./HeatingBody";

const route: ArcusRoute = { base: "varme", sub: null };

const meta = {
  title: "Sheets/Heating",
  component: HeatingBody,
  args: {
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
        <HeatingBody {...args} />
      </div>
    </div>
  ),
} satisfies Meta<typeof HeatingBody>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
