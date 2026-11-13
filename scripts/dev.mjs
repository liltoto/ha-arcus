import { context } from "esbuild";

const ctx = await context({
  entryPoints: ["src/main.ts"],
  bundle: true,
  format: "esm",
  target: "es2022",
  sourcemap: true,
  loader: {
    ".css": "text",
    ".woff2": "dataurl",
  },
  outfile: "dist/arcus.js",
});

await ctx.watch();
const { host, port } = await ctx.serve({ servedir: ".", port: 5173 });
console.log(`Arcus dev server: http://${host}:${port}/dev/index.html`);
