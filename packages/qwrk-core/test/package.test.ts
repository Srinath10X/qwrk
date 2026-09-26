import { expect, it } from "vitest";
import pkg from "../package.json";

it("uses import aliases that esbuild and every Node version accept", () => {
  const keys = Object.keys(pkg.imports);

  expect(keys).toEqual(["#qwrk/*"]);
  expect(keys.every((key) => /^#[^/]/.test(key))).toBe(true);
});
