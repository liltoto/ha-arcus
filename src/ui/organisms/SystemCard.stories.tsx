import type { Meta, StoryObj } from "@storybook/react";
import { createTranslator } from "../../localize";
import type { SystemCardModel } from "../../types";
import { systemCardView } from "../home-view";
import { SystemCard } from "./SystemCard";

const t = createTranslator("da");

const ventilation: SystemCardModel = {
  id: "ventilation",
  name: "Ventilation",
  icon: "fan",
  tint: "var(--sky)",
  temp: {
    entityId: "sensor.nilan602_actual_room_temperature",
    state: "23.2",
    unit: "°C",
  },
  humidity: {
    entityId: "sensor.nilan602_humidity",
    state: "37.98",
    unit: "%",
  },
  step: {
    entityId: "sensor.nilan602_actual_fan_step",
    state: "2",
  },
};

const outdoor: SystemCardModel = {
  id: "outdoor",
  name: "Ude",
  icon: "thermometer",
  tint: "var(--sage)",
  temp: {
    entityId: "sensor.outdoor_temperature",
    state: "2.2",
    unit: "°C",
  },
  humidity: {
    entityId: "sensor.outdoor_humidity",
    state: "87",
    unit: "%",
  },
};

const meta = {
  title: "Home/SystemCard",
  component: SystemCard,
  args: {
    card: systemCardView(ventilation, "da", t),
    onOpen: () => undefined,
  },
} satisfies Meta<typeof SystemCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Ventilation: Story = {};

export const Outdoor: Story = {
  args: { card: systemCardView(outdoor, "da", t) },
};

export const MissingReadings: Story = {
  args: {
    card: systemCardView(
      {
        ...ventilation,
        temp: null,
        humidity: null,
        step: null,
      },
      "da",
      t,
    ),
  },
};
