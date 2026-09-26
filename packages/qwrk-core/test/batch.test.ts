import { describe, expect, it, vi } from "vitest";
import { batch, derive, state } from "../dist/index.js";

describe("batch", () => {
  it("notifies once, returns fn's value and nests", () => {
    const a = state(1);
    const b = state(1);
    const seen: number[][] = [];
    derive(() => a.value + b.value).effect((value, old) =>
      seen.push([value, old]),
    );

    const result = batch(() => {
      a.value = 2;
      batch(() => (b.value = 2));
      expect(seen).toEqual([]);
      return "done";
    });

    expect(result).toBe("done");
    expect(seen).toEqual([[4, 2]]);
  });

  it("reads up to date derives inside the batch", () => {
    const a = state(1);
    const doubled = derive(() => a.value * 2);

    batch(() => {
      a.value = 5;
      expect(doubled.value).toBe(10);
    });
  });

  it("still flushes and resets when fn throws", () => {
    const a = state(1);
    const fn = vi.fn();
    a.effect(fn);

    expect(() =>
      batch(() => {
        a.value = 2;
        throw new Error("boom");
      }),
    ).toThrow("boom");
    expect(fn).toHaveBeenCalledOnce();

    a.value = 3;
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
