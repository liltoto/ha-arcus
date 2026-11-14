import type { Meta, StoryObj } from "@storybook/react";
import { PrayersBody } from "./PrayersBody";
import { c } from "../../styles/classes";

const meta = {
  title: "Sheets/Prayers",
  component: PrayersBody,
  args: {
    route: { base: "bon", sub: null },
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
      <PrayersBody {...args} />
    </div>
  ),
} satisfies Meta<typeof PrayersBody>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
