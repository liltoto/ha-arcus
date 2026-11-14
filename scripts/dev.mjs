import { spawn } from "node:child_process";

import { build, context } from "esbuild";

import { PANDA_BIN, ROOT, cssInline, runPandaBuild } from "./panda.mjs";

// Generate the helper modules and the first stylesheet before esbuild starts.
// `cssgen --watch` then keeps the stylesheet fresh without rewriting the JS
// helpers on every source edit.
runPandaBuild();
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
