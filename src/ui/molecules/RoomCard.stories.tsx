import type { Meta, StoryObj } from "@storybook/react";
import type { RoomView } from "../view-types";
import { RoomCard } from "./RoomCard";

const room: RoomView = {
  id: "stue",
  name: "Stue",
  kind: "Ophold",
  icon: "sofa",
  tint: "var(--sage)",
  temp: 21.4,
  air: "ok",
  airLabel: "CO₂ 620 ppm",
  lightsOn: 2,
  lightsTotal: 5,
  lightsLabel: "2/5 tændt",
  open: 0,
  openLabel: "Lukket",
  spark: [20.1, 20.4, 20.8, 21.1, 21.4],
};

const meta = {
  title: "Molecules/RoomCard",
  component: RoomCard,
  args: {
    room,
    onOpen: () => undefined,
    openLabel: "Åbn rum",
  },
} satisfies Meta<typeof RoomCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Wide: Story = {
  args: { room: { ...room, wide: true, name: "Køkken-alrum" } },
};

export const OpenWindow: Story = {
  args: {
    room: {
      ...room,
      open: 2,
      openLabel: "2 åbne",
      air: "warn",
      airLabel: "CO₂ 1040 ppm",
    },
  },
};

export const NoTemperature: Story = {
  args: {
    room: { ...room, temp: null, air: "off", airLabel: "Luft –" },
  },
};
