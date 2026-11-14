import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const ROOT = process.cwd();
const PANDA_CSS = path.join(ROOT, "styled-system", "styles.css");
export const PANDA_BIN = path.join(
  ROOT,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "panda.cmd" : "panda",
);

// Generate the helper modules and the stylesheet via the Panda CLI.
export function runPandaBuild(env = process.env) {
  execFileSync(PANDA_BIN, ["build"], {
    cwd: ROOT,
    stdio: "inherit",
    env,
  });
}

// Resolve `*.css?inline` imports to their file contents; `panda.css` inlines the
// generated Panda stylesheet and watches it so dev rebuilds on cssgen writes.
export const cssInline = {
  name: "css-inline",
  setup(build) {
    build.onResolve({ filter: /\.css\?inline$/ }, (args) => ({
      path: path.resolve(
        args.resolveDir,
        args.path.slice(0, -"?inline".length),
      ),
      namespace: "css-inline",
    }));
    build.onLoad({ filter: /.*/, namespace: "css-inline" }, async (args) => {
      const isPanda = path.basename(args.path) === "panda.css";
      return {
        contents: `export default ${JSON.stringify(
          await readFile(isPanda ? PANDA_CSS : args.path, "utf8"),
        )};`,
        loader: "js",
        watchFiles: isPanda ? [PANDA_CSS] : [],
      };
    });
  },
};
