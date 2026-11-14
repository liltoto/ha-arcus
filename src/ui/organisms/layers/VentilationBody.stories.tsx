import type { Decorator, Meta, StoryObj } from "@storybook/react";
import { VentilationBody } from "./VentilationBody";
import { c } from "../../styles/classes";

/** Give the body the same sheet frame it gets inside the card. */
const withSheet: Decorator = (Story) => (
  <div
    style={{
      position: "relative",
      height: "100vh",
      padding: 16,
      boxSizing: "border-box",
    }}
  >
    <div
      className={c("sheet open")}
      style={{
        position: "relative",
        inset: "auto",
        width: "min(590px, 100%)",
        height: "100%",
        margin: "0 auto",
        transform: "none",
      }}
    >
      <Story />
    </div>
  </div>
);

const meta = {
  title: "Sheets/Ventilation",
  component: VentilationBody,
  decorators: [withSheet],
  parameters: { layout: "fullscreen" },
  args: {
    route: { base: "ventilation", sub: null },
  },
} satisfies Meta<typeof VentilationBody>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
