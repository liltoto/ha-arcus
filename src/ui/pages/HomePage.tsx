import type { AtmosphereSetting } from "../../types";
import type { SheetApp } from "../../views/layers/types";
import { useConfig, useTranslator } from "../hooks";
import { HomeTemplate } from "../templates/HomeTemplate";

export interface HomePageProps {
  /**
   * The card's imperative sheet bridge. The skeleton does not call into it
   * yet; the sheet task threads it to the layer organisms.
   */
  app: SheetApp;
  atmo: AtmosphereSetting;
  dark: boolean;
  sheetOpen: boolean;
}

/**
 * Context-aware home page. It resolves the values that come from the provider
 * and hands the pure shell to `HomeTemplate`.
 */
export function HomePage({ atmo, dark, sheetOpen }: HomePageProps) {
  const config = useConfig();
  const t = useTranslator();

  return (
    <HomeTemplate
      atmo={atmo}
      dark={dark}
      density={config.density}
      sheetOpen={sheetOpen}
      sheetLabel={t("sheet.details")}
    />
  );
}
