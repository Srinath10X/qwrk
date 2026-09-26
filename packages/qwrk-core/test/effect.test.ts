import { describe, expect, it } from "vitest";
import { effect, state } from "../dist/index.js";

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
});
