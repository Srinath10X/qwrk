import { describe, expect, it } from "vitest";
import {
  batch,
  createElement as h,
  derive,
  effect,
  state,
} from "../dist/index.js";

/** Renders `count` rows whose class depends on `selected`, counting reruns. */
function table(count: number, selected: ReturnType<typeof state<number>>) {
  const rows = state(Array.from({ length: count }, (_, id) => ({ id })));
  const runs: number[] = [];
  const tbody = h(
    "tbody",
    null,
    rows.map((row) =>
      h("tr", {
        class: () => (runs.push(row.id), selected.is(row.id) ? "danger" : ""),
      }),
    ),
  ) as HTMLElement;
  runs.length = 0;
  return { rows, runs, tbody };
}

describe("State.is", () => {
  it("compares the raw value outside of a computation", () => {
    const item = { n: 1 };
    const list = state([item]);
    const picked = state(item);

    expect(picked.is(item)).toBe(true);
    expect(picked.is(list.value[0])).toBe(true);
    expect(state(NaN).is(NaN)).toBe(true);
    expect(state(1).is("1")).toBe(false);
  });

  it("re-runs only the rows whose answer changed, of 1000", () => {
    const selected = state(-1);
    const { runs, tbody } = table(1000, selected);

    selected.value = 5;
    expect(runs).toEqual([5]);
    expect(tbody.children[5].className).toBe("danger");

    runs.length = 0;
    selected.value = 900;
    expect(runs.sort()).toEqual([5, 900]);
    expect(tbody.children[5].className).toBe("");
    expect(tbody.children[900].className).toBe("danger");
    expect(tbody.querySelectorAll(".danger")).toHaveLength(1);
  });

  it("re-runs derives by key, next to the readers of .value", () => {
    const selected = state(1);
    const runs: string[] = [];
    const one = derive(() => (runs.push("one"), selected.is(1)));
    const two = derive(() => (runs.push("two"), selected.is(2)));
    const all = derive(() => (runs.push("all"), selected.value));
    runs.length = 0;

    selected.value = 3;
    expect([one.value, two.value, all.value]).toEqual([false, false, 3]);
    expect(runs.sort()).toEqual(["all", "one"]);
  });

  it("tracks the keys of a derive", () => {
    const n = state(1);
    const doubled = derive(() => n.value * 2);
    const runs: number[] = [];
    const flags = [2, 4, 6].map((key) =>
      derive(() => (runs.push(key), doubled.is(key))),
    );
    runs.length = 0;

    n.value = 2;
    expect(flags.map((flag) => flag.value)).toEqual([false, true, false]);
    expect(runs.sort()).toEqual([2, 4]);
  });

  it("runs effects once per change in a batch", async () => {
    const selected = state(0);
    const seen: boolean[] = [];
    effect(() => void seen.push(selected.is(1)));
    await new Promise((resolve) => setTimeout(resolve));

    batch(() => {
      selected.value = 1;
      selected.value = 2;
      selected.value = 1;
    });
    selected.value = 3;

    expect(seen).toEqual([false, true, false]);
  });

  it("doesn't subscribe outside of a computation", () => {
    const selected = state(0);
    selected.is(1);
    derive(() => selected.value);

    expect((selected as any).k).toBeUndefined();
  });

  it("drops the keys of removed rows", () => {
    const selected = state(0);
    const { rows } = table(100, selected);
    const keys = (selected as any).k as Map<unknown, unknown>;
    expect(keys.size).toBe(100);

    rows.value.splice(0, 60);
    expect(keys.size).toBe(40);
    rows.value = [];
    expect(keys.size).toBe(0);
  });

  it("drops the keys a derive stopped reading", () => {
    const selected = state(0);
    const use = state(true);
    const flag = derive(() => (use.value ? selected.is(1) : selected.is(2)));

    expect((selected as any).k.size).toBe(1);

    use.value = false;

    expect(flag.value).toBe(false);
    expect((selected as any).k.size).toBe(1);
    expect((selected as any).k.has(1)).toBe(false);
  });
});
