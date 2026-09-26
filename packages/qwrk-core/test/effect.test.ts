import { describe, expect, it, vi } from "vitest";
import { createElement as h, derive, effect, state } from "../dist/index.js";

declare const gc: () => void;

const mount = () => new Promise((resolve) => setTimeout(resolve));

describe("effect", () => {
  it("runs after mount, then on changes to what it read", async () => {
    const count = state(0);
    const log: number[] = [];
    effect(() => log.push(count.value));

    expect(log).toEqual([]);
    await mount();
    count.value = 1;

    expect(log).toEqual([0, 1]);
  });

  it("runs once with []", async () => {
    const count = state(0);
    const log: number[] = [];
    effect(() => log.push(count.value), []);

    await mount();
    count.value = 1;

    expect(log).toEqual([0]);
  });

  it("only watches explicit deps when given", async () => {
    const a = state(0);
    const b = state(0);
    let runs = 0;
    effect(() => (runs++, a.value + b.value), [a]);

    await mount();
    b.value = 1;
    a.value = 1;

    expect(runs).toBe(2);
  });

  it("drops dependencies it stopped reading", async () => {
    const useA = state(true);
    const a = state(0);
    const b = state(0);
    let runs = 0;
    effect(() => (runs++, useA.value ? a.value : b.value));

    await mount();
    useA.value = false;
    a.value = 1;

    expect(runs).toBe(2);
  });

  it("stops, before or after its first run", async () => {
    const count = state(0);
    let runs = 0;
    const stopEarly = effect(() => (runs++, count.value));
    stopEarly();
    const stopLater = effect(() => (runs++, count.value));

    await mount();
    stopLater();
    count.value = 1;

    expect(runs).toBe(1);
  });

  it("doesn't re-trigger itself when writing what it reads", async () => {
    const count = state(0);
    let runs = 0;
    effect(() => {
      runs++;
      if (count.value < 10) count.value = 10;
    });

    await mount();

    expect(count.value).toBe(10);
    expect(runs).toBe(1);
  });

  it("updates the DOM before effects run, and before the write returns", async () => {
    const count = state(0);
    const seen: string[] = [];
    let bound: Node | undefined;
    effect(() => seen.push(`${count.value}:${bound?.textContent ?? "-"}`));

    await mount();
    const p = h(
      "p",
      null,
      derive(() => count.value * 2),
    );
    bound = p;
    count.value = 1;

    expect(p.textContent).toBe("2");
    expect(seen).toEqual(["0:-", "1:2"]);
  });

  it("stops effects created by a derive's last run", async () => {
    const tick = state(0);
    const rows = state([1, 2, 3]);
    let runs = 0;

    function Row() {
      effect(() => (tick.value, runs++));
      return h("li", null);
    }

    h(
      "ul",
      null,
      derive(() => rows.value.map(() => h(Row, null))),
    );
    await mount();
    expect(runs).toBe(3);

    rows.value = [];
    tick.value++;

    expect(runs).toBe(3);
  });

  it("stops a .effect() created by a derive's last run", () => {
    const rows = state([1]);
    const tick = state(0);
    const fn = vi.fn();
    const list = derive(() =>
      rows.value.map((n) => {
        tick.effect(fn);
        return h("li", null, n);
      }),
    );
    h("ul", null, list);

    rows.value = [2];
    tick.value = 1;

    expect(fn).toHaveBeenCalledOnce();
  });

  it("keeps effects created outside a derive until stopped, even after gc", async () => {
    const count = state(0);
    let runs = 0;
    const stop = effect(() => (count.value, runs++));

    await mount();
    gc();
    await mount();
    gc();
    count.value = 1;
    stop();
    count.value = 2;

    expect(runs).toBe(2);
  });

  it("disposes an effect created inside an effect when the outer one re-runs", async () => {
    const outer = state(0);
    const inner = state(0);
    let runs = 0;
    effect(() => {
      outer.value;
      effect(() => (inner.value, runs++));
    });

    await mount();
    outer.value = 1;
    await mount();
    runs = 0;
    inner.value = 1;

    expect(runs).toBe(1);
  });

  it("runs every subscriber when one throws, then rethrows", () => {
    const count = state(0);
    const fn = vi.fn();
    count.effect(() => {
      throw new Error("first");
    });
    count.effect(fn);

    expect(() => (count.value = 1)).toThrow("first");
    expect(fn).toHaveBeenCalledOnce();
  });

  it("handles writes made by an effect in the same flush", async () => {
    const count = state(0);
    const clamped = state(0);
    const p = h("p", null, clamped);
    effect(() => (clamped.value = Math.min(count.value, 5)));

    await mount();
    count.value = 9;

    expect(p.textContent).toBe("5");
  });

  it("throws instead of hanging on an update loop, then keeps working", () => {
    const a = state(0);
    const b = state(0);
    const stopA = a.effect((value) => (b.value = value + 1));
    const stopB = b.effect((value) => (a.value = value + 1));

    expect(() => (a.value = 1)).toThrow("qwrk: update loop");
    stopA();
    stopB();

    const c = state(0);
    const p = h("p", null, c);
    c.value = 5;
    expect(p.textContent).toBe("5");
  });

  it("stops an effect that stops itself", async () => {
    const count = state(0);
    let runs = 0;
    const stop = effect(() => {
      runs++;
      if (count.value > 0) stop();
    });

    await mount();
    count.value = 1;
    count.value = 2;

    expect(runs).toBe(2);
  });

  it("keeps an effect alive when a derive it reads throws", async () => {
    const n = state(1);
    const inverse = derive(() => {
      if (n.value === 0) throw new Error("zero");
      return 1 / n.value;
    });
    const seen: number[] = [];
    effect(() => seen.push(inverse.value));

    await mount();
    expect(() => (n.value = 0)).toThrow("zero");
    n.value = 2;

    expect(seen).toEqual([1, 0.5]);
  });

  it("updates the DOM an earlier effect changed before the next effect runs", async () => {
    const tick = state(0);
    const copy = state(0);
    const p = h("p", null, copy);
    const seen: string[] = [];
    effect(() => (copy.value = tick.value));
    effect(() => {
      tick.value;
      seen.push(`${copy.value}:${p.textContent}`);
    });

    await mount();
    tick.value = 1;

    expect(seen).toEqual(["0:0", "1:1"]);
  });
});
