/**
 * Self-contained webfonts.
 *
 * The woff2 files are subset from the upstream OFL variable fonts by
 * `scripts/fonts.sh` and inlined by esbuild as data URLs. The bundle therefore
 * never needs a runtime request to Google Fonts.
 */
// @ts-expect-error -- esbuild's dataurl loader resolves binary assets; TS has no declaration for .woff2.
import frauncesUrl from "../../assets/fonts/fraunces-latin.woff2";
// @ts-expect-error -- esbuild's dataurl loader resolves binary assets; TS has no declaration for .woff2.
import interTightUrl from "../../assets/fonts/inter-tight-latin.woff2";

export const FONT_FACE_CSS = `
@font-face {
  font-family: "Fraunces";
  font-style: normal;
  font-weight: 100 900;
  font-display: swap;
  src: url("${frauncesUrl}") format("woff2");
}

@font-face {
  font-family: "Inter Tight";
  font-style: normal;
  font-weight: 100 900;
  font-display: swap;
  src: url("${interTightUrl}") format("woff2");
}
`;
