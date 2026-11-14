import type { Meta, StoryObj } from "@storybook/react";
import { storyApp } from "../../providers/StoryProviders";
import type { ArcusRoute } from "../../types";
import { TechBody } from "./TechBody";

const route: ArcusRoute = { base: "teknik", sub: null };

const meta = {
  title: "Organisms/Layers/TechBody",
  component: TechBody,
  args: {
    app: storyApp,
    route,
  },
  render: (args) => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
      }}
    >
      <TechBody {...args} />
    </div>
  ),
} satisfies Meta<typeof TechBody>;

export default meta;

type Story = StoryObj<typeof meta>;

export const NetworkAndInverter: Story = {};
