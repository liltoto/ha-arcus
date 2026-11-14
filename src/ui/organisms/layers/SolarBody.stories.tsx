import type { Meta, StoryObj } from "@storybook/react";
import { SolarBody } from "./SolarBody";

const meta = {
  title: "Layers/Solar",
  component: SolarBody,
  args: {
    route: { base: "sol", sub: null },
  },
  parameters: { layout: "fullscreen" },
  render: (args) => (
    <div style={{ height: "100vh" }}>
      <SolarBody {...args} />
    </div>
  ),
} satisfies Meta<typeof SolarBody>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Overview: Story = {};

export const Production: Story = {
  args: { route: { base: "sol", sub: "produktion" } },
};

export const Battery: Story = {
  args: { route: { base: "sol", sub: "batteri" } },
};

export const Forecast: Story = {
  args: { route: { base: "sol", sub: "prognose" } },
};

export const Payback: Story = {
  args: { route: { base: "sol", sub: "afkast" } },
};
