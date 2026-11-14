import { build } from "esbuild";

import { cssInline, runPandaBuild } from "./panda.mjs";

runPandaBuild({ ...process.env, NODE_ENV: "production" });

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
