import { expect, test } from "vitest";
import { arcPoint, downsample, priceColor, sparkPath } from "../src/render/charts";

test("the arc is a symmetric 1000x300 parabola", () => {
  expect(arcPoint(0)).toEqual({ x: 40, y: 210 });
  expect(arcPoint(0.5)).toEqual({ x: 500, y: 60 });
  expect(arcPoint(1)).toEqual({ x: 960, y: 210 });
});

test("sparkPath breaks at null", () => {
  const d = sparkPath([1, null, 3], 100, 28, 2);
  expect(d.match(/M/g)).toHaveLength(2);
});

test("priceColor uses the audited three-step price palette", () => {
  expect(priceColor(10, 0, 100)).toBe("#8FB08B");
  expect(priceColor(50, 0, 100)).toBe("#D8A657");
  expect(priceColor(90, 0, 100)).toBe("#E0785E");
  expect(priceColor(null, 0, 100)).toBe("#6b7280");
});

test("downsample averages into target buckets and preserves gaps", () => {
  expect(downsample([1, 2, 3, 4, 5, 6], 3)).toEqual([1.5, 3.5, 5.5]);
  expect(downsample([1, null, 3, 5], 2)).toEqual([1, 4]);
  expect(downsample([1, 2], 4)).toEqual([1, 2]);
});
