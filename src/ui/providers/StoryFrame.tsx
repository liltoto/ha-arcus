import {
  createElement,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import type { Decorator } from "@storybook/react";
import { STYLES } from "../../render/styles";

/**
 * Storybook renders outside the card's shadow root, but Arcus CSS is written
 * for `:host`. Every story is therefore portalled into a real shadow root so
 * the component sees the same cascade it sees inside Home Assistant.
 */
class ArcStoryHost extends HTMLElement {
  readonly root: ShadowRoot;

  constructor() {
    super();
    this.root = this.attachShadow({ mode: "open" });
  }
}

if (!customElements.get("arc-story-host")) {
  customElements.define("arc-story-host", ArcStoryHost);
}

interface ShadowHostProps {
  theme: "dark" | "light";
  density: "comfortable" | "compact";
  children: ReactNode;
}

function ShadowHost({ theme, density, children }: ShadowHostProps) {
  const hostRef = useRef<ArcStoryHost | null>(null);
  const [root, setRoot] = useState<ShadowRoot | null>(null);

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    host.dataset.theme = theme;
    host.dataset.density = density;
    setRoot(host.root);
  }, [theme, density]);

  return createElement(
    "arc-story-host",
    {
      ref: (node: HTMLElement | null) => {
        hostRef.current = node as ArcStoryHost | null;
      },
    },
    root
      ? createPortal(
          <>
            <style>{STYLES}</style>
            <div
              className={`app${theme === "light" ? " light" : ""}`}
              data-atmo="night"
              data-density={density}
              style={{ minHeight: "100%" }}
            >
              {children}
            </div>
          </>,
          root,
        )
      : null,
  );
}

export const withStoryFrame: Decorator = (Story, context) => {
  const theme =
    (context.globals.theme as "dark" | "light" | undefined) ?? "dark";
  const density =
    (context.globals.density as "comfortable" | "compact" | undefined) ??
    "comfortable";

  return (
    <ShadowHost theme={theme} density={density}>
      <Story />
    </ShadowHost>
  );
};
