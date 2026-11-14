import { Icon } from "../atoms/Icon";
import { useBindings, useTranslator } from "../hooks";

export interface FooterProps {
  className?: string;
}

/**
 * The footer mark, clock, and Home Assistant version line. The surrounding
 * `<footer class="footer">` slot lives in `HomeTemplate`.
 */
export function Footer({ className }: FooterProps = {}) {
  const t = useTranslator();
  const bindings = useBindings();

  return (
    <>
      <span className={className ? `mark ${className}` : "mark"}>
        <Icon name="sun" /> {t("brand.footer")} · <span>{bindings.clock}</span>
      </span>
      <span>
        {t("brand.homeAssistant")} · <span>{bindings.version}</span>
      </span>
    </>
  );
}
