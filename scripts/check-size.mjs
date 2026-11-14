import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";

const file = "dist/arcus.js";
const limit = 400 * 1024;
const bytes = readFileSync(file);
const gzip = gzipSync(bytes).length;

const rawKb = (bytes.length / 1024).toFixed(1);
const gzipKb = (gzip / 1024).toFixed(1);
const limitKb = (limit / 1024).toFixed(0);

console.log(`arcus.js ${rawKb} KB raw, ${gzipKb} KB gzip (limit ${limitKb} KB gzip)`);

if (gzip > limit) {
  console.error(
    `Bundle is ${gzipKb} KB gzip, over the ${limitKb} KB budget.`,
  );
  process.exit(1);
}
