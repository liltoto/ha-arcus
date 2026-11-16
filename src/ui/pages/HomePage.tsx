import { useAtmo, useConfig, useDark } from "../hooks";
import { HomeTemplate } from "../templates/HomeTemplate";
import { SheetFrame } from "./SheetFrame";

/**
 * Context-aware home page. It resolves the values that come from the store
 * and hands the pure shell to `HomeTemplate`.
 */
export const HomePage = () => {
  const config = useConfig();
  const atmo = useAtmo();
  const dark = useDark();

  return (
    <HomeTemplate
      atmo={atmo}
      dark={dark}
      density={config.density}
      textScale={config.text_scale}
      sheet={<SheetFrame />}
    />
  );
};
