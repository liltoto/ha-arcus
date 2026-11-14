import type { CSSProperties } from "react";
import type { Decorator } from "@storybook/react";
import { c } from "../styles/classes";

type SheetFrameVariant = "fill" | "page";

const SHEET_BASE: CSSProperties = {
  position: "relative",
  inset: "auto",
  width: "min(590px, 100%)",
  transform: "none",
};

const SHEET_STYLES: Record<SheetFrameVariant, CSSProperties> = {
  // Ventilation/Water: the sheet fills the frame from edge to edge.
  fill: {
    ...SHEET_BASE,
    height: "100%",
    margin: "0 auto",
  },
  // Heating/Security: a centered card on a page-height canvas.
  page: {
    ...SHEET_BASE,
    height: "min(880px, calc(100vh - 48px))",
    borderRadius: 24,
  },
};

const FRAME_STYLES: Record<SheetFrameVariant, CSSProperties> = {
  fill: {
    position: "relative",
    height: "100vh",
    padding: 16,
    boxSizing: "border-box",
  },
  page: {
    minHeight: "100vh",
    padding: 24,
    display: "flex",
    justifyContent: "center",
  },
};

/** Give a sheet body the same frame it gets inside the card. */
export function withSheet(variant: SheetFrameVariant = "fill"): Decorator {
  return (Story) => (
    <div style={FRAME_STYLES[variant]}>
      <div className={c("sheet open")} style={SHEET_STYLES[variant]}>
        <Story />
      </div>
    </div>
  );
}
