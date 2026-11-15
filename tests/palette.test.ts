import { describe, expect, it } from "vitest";
import config from "../panda.config";

/**
 * Contrast guard for the palette. It reads the real `globalCss` declarations,
 * resolves `var(--name)` aliases inside the theme that owns them, and checks
 * WCAG AA for body-sized text (4.5:1) plus 3:1 for focus rings. Dependency
 * free on purpose: the config stays the source of truth and the maths is
 * local, so a palette tweak fails here before it ships.
 */

type StyleBlock = Record<string, string>;

const globalCss = config.globalCss as unknown as Record<string, StyleBlock>;

function block(selector: string): StyleBlock {
  const styles = globalCss[selector];
  if (!styles) throw new Error(`Missing globalCss block: ${selector}`);
  return styles;
}

interface Theme {
  label: string;
  /** Highest precedence first, mirroring the cascade. */
  blocks: StyleBlock[];
}

const DARK: Theme = { label: "dark", blocks: [block(".app")] };
const LIGHT: Theme = { label: "light", blocks: [block(".app.light")] };

const TEXT_TOKENS = [
  "--text",
  "--text-2",
  "--muted",
  "--accent-text",
  "--coral-text",
  "--brass-text",
  "--sky-text",
  "--sage-text",
  "--plum-text",
] as const;

const SURFACES = ["--bg-0", "--bg-1", "--bg-2", "--bg-3"] as const;

const LIGHT_ATMOS = ["night", "dawn", "day", "dusk"] as const;

const ALIAS = /^var\((--[a-z0-9-]+)\)$/i;

function colorOf(theme: Theme, name: string, depth = 0): string {
  for (const styles of theme.blocks) {
    const value = styles[name];
    if (value !== undefined) return resolveAlias(theme, value, depth);
  }
  throw new Error(`Missing ${name} in the ${theme.label} palette`);
}

function resolveAlias(theme: Theme, value: string, depth: number): string {
  const alias = ALIAS.exec(value.trim());
  if (!alias) return value.trim();
  if (depth > 8) {
    throw new Error(`Cyclic palette alias in ${theme.label}: ${value}`);
  }
  return colorOf(theme, alias[1], depth + 1);
}

function rgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3 ? [...clean].map((char) => char + char).join("") : clean;
  if (!/^[0-9a-f]{6}$/i.test(full)) throw new Error(`Not a hex colour: ${hex}`);
  return [
    Number.parseInt(full.slice(0, 2), 16),
    Number.parseInt(full.slice(2, 4), 16),
    Number.parseInt(full.slice(4, 6), 16),
  ];
}

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const [r, g, b] = rgb(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(foreground: string, background: string): number {
  const [light, dark] = [luminance(foreground), luminance(background)].sort(
    (a, b) => b - a,
  );
  return (light + 0.05) / (dark + 0.05);
}

for (const theme of [DARK, LIGHT]) {
  describe(`${theme.label} palette`, () => {
    for (const token of TEXT_TOKENS) {
      it(`${token} clears AA on every surface`, () => {
        for (const bg of SURFACES) {
          const ratio = contrast(colorOf(theme, token), colorOf(theme, bg));
          expect(ratio, `${token} on ${bg}`).toBeGreaterThanOrEqual(4.5);
        }
      });
    }
  });
}

describe("light atmosphere accents", () => {
  for (const atmo of LIGHT_ATMOS) {
    it(`${atmo} keeps accent text and focus legible on --bg-1`, () => {
      const selector = `.app.light[data-atmo='${atmo}']`;
      const styles = block(selector);
      expect(
        styles["--accent-text"],
        `${selector} overrides --accent-text`,
      ).toBeDefined();
      expect(styles["--focus"], `${selector} overrides --focus`).toBeDefined();

      const theme: Theme = {
        label: `light ${atmo}`,
        blocks: [styles, block(".app.light")],
      };
      const bg = colorOf(theme, "--bg-1");
      expect(
        contrast(colorOf(theme, "--accent-text"), bg),
        `--accent-text on --bg-1 (${atmo})`,
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        contrast(colorOf(theme, "--focus"), bg),
        `--focus on --bg-1 (${atmo})`,
      ).toBeGreaterThanOrEqual(3);
    });
  }
});
