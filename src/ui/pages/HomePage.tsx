import type { AtmosphereSetting } from "../../types";
import { useConfig } from "../hooks";
import { HomeTemplate } from "../templates/HomeTemplate";

export interface HomePageProps {
  atmo: AtmosphereSetting;
  dark: boolean;
}

/**
 * Context-aware home page. It resolves the values that come from the provider
 * and hands the pure shell to `HomeTemplate`.
 */
export function HomePage({ atmo, dark }: HomePageProps) {
  const config = useConfig();

  return (
    <HomeTemplate atmo={atmo} dark={dark} density={config.density} />
  );
}
