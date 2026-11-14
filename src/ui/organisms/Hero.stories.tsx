import type { Decorator, Meta, StoryObj } from "@storybook/react";
import { useMemo, type ReactNode } from "react";
import { useArcusStore, useBindings } from "../hooks";
import { ArcusProvider } from "../providers/ArcusProvider";
import { createArcusStore } from "../providers/store";
import { Hero } from "./Hero";

/**
 * The shared fixture provides the model, actions, and translations, but the
 * hero copy is composed by the card's `_binds()`. Fill those few keys in a
 * nested provider so the story shows the finished greeting.
 */
const HERO_COPY: Record<string, string> = {
  eyebrow: "NÆSTE BØN · ISHA 18:11",
  greet: "Godnat, <em>liltoto</em>",
  heroDate: "Fredag · kl. 01.19",
  weatherTemp: "2,2°",
  weatherSub: "delvist skyet",
};

function HeroFixture({ children }: { children: ReactNode }) {
  const store = useArcusStore();
  const bindings = useBindings();
  const heroStore = useMemo(
    () =>
      createArcusStore({
        ...store.getState(),
        bindings: { ...bindings, ...HERO_COPY },
      }),
    [store, bindings],
  );

  return <ArcusProvider store={heroStore}>{children}</ArcusProvider>;
}

const withHeroCopy: Decorator = (Story) => (
  <HeroFixture>
    <Story />
  </HeroFixture>
);

const meta = {
  title: "Home/Hero",
  component: Hero,
  decorators: [withHeroCopy],
} satisfies Meta<typeof Hero>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
