import { atomsStyles } from "./atoms";
import { homeStyles } from "./home";
import { sheetStyles } from "./sheet";

const STYLE_MAP: Record<string, string> = {
  ...atomsStyles,
  ...homeStyles,
  ...sheetStyles,
};

/**
 * Turn a list of semantic Arcus class names into the same names plus their
 * generated Panda classes. Keeping the semantic names is deliberate: unit
 * tests and Playwright use them as stable hooks, while Panda owns the actual
 * declarations.
 */
export function c(...names: Array<string | false | null | undefined>): string {
  const classes: string[] = [];
  const seen = new Set<string>();
  const add = (name: string): void => {
    if (!name || seen.has(name)) return;
    seen.add(name);
    classes.push(name);
    const generated = STYLE_MAP[name];
    if (generated) classes.push(generated);
  };

  for (const value of names) {
    if (!value) continue;
    for (const name of value.split(/\s+/)) add(name);
  }
  return classes.join(" ");
}
