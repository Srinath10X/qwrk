import { describe, expect, it } from "vitest";
import {
  createElement as h,
  derive,
  effect,
  state,
  type State,
} from "../dist/index.js";

declare const gc: () => void;

/** Runs full garbage collections until finalizers have had a chance to run. */
async function collect() {
  for (let i = 0; i < 10; i++) {
    gc();
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

describe("memory", () => {
  it("frees list items that were rebuilt away, even when they bind a shared state", async () => {
    const count = state(0);
    const todos = state([0]);
    const ul = h(
      "ul",
      null,
      derive(() => todos.value.map((n) => h("li", { title: count }, n, count))),
    );
    document.body.append(ul);

    let freed = 0;
    const registry = new FinalizationRegistry(() => freed++);

    for (let i = 1; i <= 200; i++) {
      for (const li of ul.children) registry.register(li, null);
      todos.value = [i];
    }
    await collect();

    expect(freed).toBeGreaterThan(150);
    count.value = 1;
    expect(ul.innerHTML).toBe('<li title="1">2001</li>');
  });

  it("keeps states that only the page uses alive", async () => {
    const count = state(1);
    const div = h(
      "div",
      { title: derive(() => count.value * 3) },
      derive(() => count.value * 2),
    );
    document.body.append(div);

    await collect();
    count.value = 5;

    expect(div.outerHTML).toBe('<div title="15">10</div>');
  });

  it("keeps derives with an effect or a .effect() alive", async () => {
    const count = state(1);
    const seen: number[] = [];
    derive(() => count.value * 2).effect((value) => seen.push(value));
    const tripled = derive(() => count.value * 3);
    effect(() => seen.push(tripled.value));

    await collect();
    count.value = 2;

    expect(seen).toEqual([3, 4, 6]);
  });

  it("releases a state a derive stopped reading", async () => {
    let freed = 0;
    const registry = new FinalizationRegistry(() => freed++);
    const useA = state(true);
    const b = state(2);
    const holder: { a: State<number> | null } = { a: state(1) };
    registry.register(holder.a!, null);
    const picked = derive(() => (useA.value ? holder.a!.value : b.value));

    useA.value = false;
    holder.a = null;
    await collect();

    expect(picked.value).toBe(2);
    expect(freed).toBe(1);
  });

  it("frees what a one-shot effect captured", async () => {
    let freed = 0;
    const registry = new FinalizationRegistry(() => freed++);

    for (let i = 0; i < 50; i++) {
      const p = h("p", null);
      effect(() => p.setAttribute("id", "x"), []);
      registry.register(p, null);
    }
    await collect();

    expect(freed).toBeGreaterThan(40);
  });

  it("drops subscriptions of collected DOM on a state that is never written", async () => {
    const count = state(0);
    let most = 0;

    for (let round = 0; round < 40; round++) {
      for (let i = 0; i < 100; i++) h("p", { title: count }, count);
      gc();
      await new Promise((resolve) => setTimeout(resolve));
      gc();
      most = Math.max(most, (count as any).o.size);
    }

    expect(most).toBeLessThan(420);
  });
});
