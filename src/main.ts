import "./card";
import "./views/sheet";
import "./editor";
import "./strategy";
import "./strategy-editor";

import { ARCUS_VERSION } from "./version";

interface CustomCardEntry {
  type: string;
  name: string;
  description: string;
  preview?: boolean;
  documentationURL?: string;
}

declare global {
  interface Window {
    customCards?: CustomCardEntry[];
  }
}

window.customCards = window.customCards || [];
window.customCards.push({
  type: "arcus-card",
  name: "Arcus",
  description: "A calm, day-arc dashboard for Home Assistant.",
  preview: true,
  documentationURL: "https://github.com/liltoto/ha-arcus",
});

console.info(
  `%c ARCUS %c v${ARCUS_VERSION} `,
  "background:#d8a657;color:#080b0f;font-weight:700;border-radius:3px 0 0 3px",
  "background:#1a2230;color:#f2ebe1;border-radius:0 3px 3px 0",
);

export { ARCUS_VERSION };
