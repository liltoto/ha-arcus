import type { Meta, StoryObj } from "@storybook/react";
import { Footer } from "./Footer";
import { c } from "../styles/classes";

const meta = {
  title: "Home/Footer",
  component: Footer,
  parameters: {
    docs: {
      description: {
        component:
          "The footer mark, live clock, and Home Assistant version line shown below the home sections.",
      },
    },
  },
  render: () => (
    <footer className={c("footer")}>
      <Footer />
    </footer>
  ),
} satisfies Meta<typeof Footer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
