import type { ReactNode } from "react";

/**
 * The flex column every ported sheet body returns. `data-react-layer` tells
 * the card's legacy click delegation that React owns the events inside it.
 */
export function LayerShell({ children }: { children: ReactNode }) {
  return (
    <div
      data-react-layer
      style={{
        display: "flex",
        flexDirection: "column",
        flex: "1 1 auto",
        minHeight: 0,
      }}
    >
      {children}
    </div>
  );
}
