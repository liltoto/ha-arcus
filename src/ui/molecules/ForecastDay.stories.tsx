import type { Meta, StoryObj } from "@storybook/react";
import { ForecastDay } from "./ForecastDay";
import { c } from "../styles/classes";

const meta = {
  title: "Molecules/ForecastDay",
  component: ForecastDay,
  args: {
    name: "I dag",
    icon: "cloud",
    high: "14°",
    low: "8°",
  },
  render: (args) => (
    <div className={c("weather-strip")}>
      <ForecastDay {...args} />
    </div>
  ),
} satisfies Meta<typeof ForecastDay>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Rain: Story = {
  args: { name: "I morgen", icon: "rain", high: "11°", low: "6°" },
};

export const Clear: Story = {
  args: { name: "Man", icon: "sun", high: "17°", low: "9°" },
};
