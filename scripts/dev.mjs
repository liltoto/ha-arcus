import { readFile } from "node:fs/promises";
import path from "node:path";
import { build, context } from "esbuild";

const cssInline = {
  name: "css-inline",
  setup(build) {
    build.onResolve({ filter: /\.css\?inline$/ }, (args) => ({
      path: path.resolve(args.resolveDir, args.path.slice(0, -"?inline".length)),
      namespace: "css-inline",
    }));
    build.onLoad({ filter: /.*/, namespace: "css-inline" }, async (args) => ({
      contents: `export default ${JSON.stringify(await readFile(args.path, "utf8"))};`,
      loader: "js",
    }));
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
