import type { Meta, StoryObj } from "@storybook/react";
import type { ChapterView } from "../view-types";
import { ChapterCard } from "./ChapterCard";

const chapter: ChapterView = {
  key: "vand",
  title: "Vand",
  icon: "drop",
  sum: "Salt 62 % · ingen lækager",
  num: "03",
  meta: "Alt tørt",
};

const meta = {
  title: "Molecules/ChapterCard",
  component: ChapterCard,
  args: {
    chapter,
    onOpen: () => undefined,
  },
} satisfies Meta<typeof ChapterCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const LargeWithArt: Story = {
  args: {
    chapter: {
      key: "energi",
      title: "Energi",
      icon: "bolt",
      sum: "2,4 kWh i dag · 1,84 kr/kWh",
      num: "01",
      large: true,
      meta: "Pris nu",
      art: (
        <div className="price-bars">
          <i style={{ height: "22%" }} />
          <i style={{ height: "38%" }} />
          <i style={{ height: "64%" }} />
          <i style={{ height: "42%" }} />
          <i style={{ height: "78%" }} />
          <i style={{ height: "55%" }} />
          <i style={{ height: "31%" }} />
        </div>
      ),
    },
  },
};

export const ZoneArt: Story = {
  args: {
    chapter: {
      key: "ventilation",
      title: "Luft",
      icon: "fan",
      sum: "Trin 2 · 41 % RH",
      num: "05",
      art: (
        <div className="zone-strip">
          <i style={{ height: "20%", opacity: 0.85 }} />
          <i style={{ height: "36%", opacity: 0.85 }} />
          <i style={{ height: "52%", opacity: 0.85 }} />
          <i style={{ height: "68%", opacity: 0.25 }} />
          <i style={{ height: "84%", opacity: 0.25 }} />
        </div>
      ),
    },
  },
};
