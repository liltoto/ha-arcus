import { build } from "esbuild";

await build({
  entryPoints: ["src/main.ts"],
  bundle: true,
  format: "esm",
  target: "es2022",
  minify: true,
  sourcemap: false,
  legalComments: "none",
  loader: {
    ".css": "text",
    ".woff2": "dataurl",
  },
  outfile: "dist/arcus.js",
  logLevel: "info",
});
