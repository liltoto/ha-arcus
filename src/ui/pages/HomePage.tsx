import type { AtmosphereSetting } from "../../types";
import type { SheetApp } from "../../views/layers/types";
import { useConfig } from "../hooks";
import { HomeTemplate } from "../templates/HomeTemplate";

export interface HomePageProps {
  /** The card's imperative bridge; the sheet frame hands it to the layers. */
  app: SheetApp;
  atmo: AtmosphereSetting;
  dark: boolean;
}

/**
 * Context-aware home page. It resolves the values that come from the provider
 * and hands the pure shell to `HomeTemplate`.
 */
export function HomePage({ app, atmo, dark }: HomePageProps) {
  const config = useConfig();

  return (
    <HomeTemplate app={app} atmo={atmo} dark={dark} density={config.density} />
  );
}
