import { describe, expect, it } from "vitest";
import { createElement as h, derive, state } from "../dist/index.js";

describe("derive", () => {
  it("detects dependencies, including chained derives", () => {
    const price = state(250);
    const qty = state(2);
    let runs = 0;
    const total = derive(() => (runs++, price.value * qty.value));
    const withTax = derive(() => total.value + 1);

    qty.value = 3;
    qty.value = 4;

    expect(total.value).toBe(1000);
    expect(withTax.value).toBe(1001);
    expect(runs).toBe(3);
  });

  it("only watches explicit deps when given", () => {
    const a = state(1);
    const b = state(1);
    const sum = derive(() => a.value + b.value, [a]);

    b.value = 5;
    expect(sum.value).toBe(2);
    a.value = 2;
    expect(sum.value).toBe(7);
  });

  it("drops dependencies it stopped reading", () => {
    const useA = state(true);
    const a = state(0);
    const b = state(0);
    let runs = 0;
    const picked = derive(() => (runs++, useA.value ? a.value : b.value));

    useA.value = false;
    a.value = 1;
    a.value = 2;
    expect(runs).toBe(2);

    b.value = 7;
    expect(runs).toBe(3);
    expect(picked.value).toBe(7);
  });

  it("doesn't loop when it changes its own source", () => {
    const nums = state([3, 1, 2]);
    const sorted = derive(() => nums.value.sort());

    nums.value.push(0);

    expect([...sorted.value]).toEqual([0, 1, 2, 3]);
  });

  it("doesn't rebuild a component when the component's own state changes", () => {
    let mounts = 0;
    let inner = state(0);

    function Counter() {
      mounts++;
      inner = state(0);
      return h("span", null, inner);
    }

    const open = state(true);
    const div = h(
      "div",
      null,
      derive(() => (open.value ? h(Counter, null) : null)),
    );

    inner.value = 5;
    expect(mounts).toBe(1);
    expect(div.innerHTML).toBe("<span>5</span>");

    open.value = false;
    expect(div.innerHTML).toBe("");
  });
});
