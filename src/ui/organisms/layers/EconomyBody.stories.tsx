import type { Meta, StoryObj } from "@storybook/react";
import { storyApp } from "../../providers/StoryProviders";
import type { ArcusRoute } from "../../types";
import { EconomyBody } from "./EconomyBody";

const route: ArcusRoute = { base: "oekonomi", sub: null };

const meta = {
  title: "Organisms/Layers/EconomyBody",
  component: EconomyBody,
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
      <EconomyBody {...args} />
    </div>
  ),
} satisfies Meta<typeof EconomyBody>;

export default meta;

type Story = StoryObj<typeof meta>;

export const BondOverview: Story = {};
