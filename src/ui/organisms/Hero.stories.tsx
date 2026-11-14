import type { Decorator, Meta, StoryObj } from "@storybook/react";
import type { ReactNode } from "react";
import {
  useActions,
  useBindings,
  useConfig,
  useHass,
  useHistory,
  useModel,
  useNow,
  useRoute,
  useTranslator,
} from "../hooks";
import { ArcusProvider } from "../providers/ArcusProvider";
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
  const hass = useHass();
  const model = useModel();
  const config = useConfig();
  const t = useTranslator();
  const bindings = useBindings();
  const route = useRoute();
  const actions = useActions();
  const history = useHistory();
  const now = useNow();

  return (
    <ArcusProvider
      hass={hass}
      model={model}
      config={config}
      t={t}
      bindings={{ ...bindings, ...HERO_COPY }}
      route={route}
      actions={actions}
      history={history}
      now={now}
    >
      {children}
    </ArcusProvider>
  );
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
