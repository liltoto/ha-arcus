import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { build } from "esbuild";

const ROOT = process.cwd();
const PANDA_CSS = path.join(ROOT, "styled-system", "styles.css");
const PANDA_BIN = path.join(
  ROOT,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "panda.cmd" : "panda",
);

execFileSync(PANDA_BIN, ["build"], {
  cwd: ROOT,
  stdio: "inherit",
  env: { ...process.env, NODE_ENV: "production" },
});

const cssInline = {
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

await build({
  entryPoints: ["src/main.ts"],
  bundle: true,
  format: "esm",
  target: "es2022",
  minify: true,
  sourcemap: false,
  legalComments: "none",
  jsx: "automatic",
  define: {
    "process.env.NODE_ENV": '"production"',
  },
  plugins: [cssInline],
  loader: {
    ".css": "text",
    ".woff2": "dataurl",
  },
  outfile: "dist/arcus.js",
  logLevel: "info",
});
