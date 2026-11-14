import { execFileSync, spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { build, context } from "esbuild";

const ROOT = process.cwd();
const PANDA_CSS = path.join(ROOT, "styled-system", "styles.css");
const PANDA_BIN = path.join(
  ROOT,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "panda.cmd" : "panda",
);

// Generate the helper modules and the first stylesheet before esbuild starts.
// `cssgen --watch` then keeps the stylesheet fresh without rewriting the JS
// helpers on every source edit.
execFileSync(PANDA_BIN, ["build"], { cwd: ROOT, stdio: "inherit" });
const pandaWatch = spawn(PANDA_BIN, ["cssgen", "--watch"], {
  cwd: ROOT,
  stdio: "inherit",
});
pandaWatch.on("exit", (code) => {
  if (code && code !== 0) {
    console.error(`panda cssgen exited with code ${code}`);
    process.exit(code);
  }
});
const stopPanda = () => {
  if (!pandaWatch.killed) pandaWatch.kill("SIGTERM");
};
process.on("exit", stopPanda);
process.on("SIGINT", () => {
  stopPanda();
  process.exit(0);
});
process.on("SIGTERM", () => {
  stopPanda();
  process.exit(0);
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
        // Rebuild the bundle when Panda writes the generated stylesheet.
        watchFiles: isPanda ? [PANDA_CSS] : [],
      };
    });
  },
};

await build({
  entryPoints: ["tests/fixtures/home.ts"],
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  outfile: "dev/fixture.js",
  logLevel: "info",
});

const ctx = await context({
  entryPoints: ["src/main.ts"],
  bundle: true,
  format: "esm",
  target: "es2022",
  sourcemap: true,
  jsx: "automatic",
  define: {
    "process.env.NODE_ENV": '"development"',
  },
  plugins: [cssInline],
  loader: {
    ".css": "text",
    ".woff2": "dataurl",
  },
  outfile: "dist/arcus.js",
});

await ctx.watch();
const { host, port } = await ctx.serve({ servedir: ".", port: 5173 });
console.log(`Arcus dev server: http://${host}:${port}/dev/index.html`);
