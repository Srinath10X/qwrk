import { describe, expect, it } from "vitest";
import {
  createElement as h,
  derive,
  state,
  type State,
} from "../dist/index.js";

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

  it("doesn't notify dependents of a derive whose value is unchanged", () => {
    const count = state(1);
    let runs = 0;
    const positive = derive(() => count.value > 0);
    const label = derive(() => (runs++, positive.value ? "yes" : "no"));

    count.value = 2;
    count.value = 3;

    expect(label.value).toBe("yes");
    expect(runs).toBe(1);
  });

  it("propagates a derive returning the same array after it changed in place", () => {
    const nums = state([2, 1]);
    const sorted = derive(() => nums.value.sort());
    const div = h("div", null, sorted);

    nums.value.push(0);

    expect(div.textContent).toBe("012");
  });

  it("recomputes a diamond once, with consistent values", () => {
    const a = state(1);
    const b = derive(() => a.value * 2);
    const c = derive(() => a.value * 3);
    const seen: string[] = [];
    const d = derive(() => {
      seen.push(`${b.value}+${c.value}`);
      return b.value + c.value;
    });

    a.value = 2;

    expect(seen).toEqual(["2+3", "4+6"]);
    expect(d.value).toBe(10);
  });

  it("disposes a stale child before it can see its owner's old condition", () => {
    const user = state<{ name: string } | null>({ name: "Ada" });
    const view = derive(() =>
      user.value
        ? h(
            "p",
            null,
            derive(() => user.value!.name),
          )
        : "signed out",
    );
    const div = h("div", null, view);

    expect(() => (user.value = null)).not.toThrow();
    expect(div.textContent).toBe("signed out");
  });

  it("keeps its subscriptions when dependencies are unchanged", () => {
    const a = state(1);
    const b = state(1);
    const sum = derive(() => a.value + b.value) as any;
    const before = [...sum.s.values()];

    for (let i = 2; i < 10; i++) a.value = i;

    expect([...sum.s.values()]).toEqual(before);
    expect([...sum.s.values()].every((entry, i) => entry === before[i])).toBe(
      true,
    );
    expect((a as any).o.size).toBe(1);
    expect(sum.value).toBe(10);
  });

  it("unsubscribes from a state it stopped reading", () => {
    const pick = state(true);
    const a = state("a");
    const b = state("b");
    const picked = derive(() => (pick.value ? a.value : b.value)) as any;

    pick.value = false;

    expect((a as any).o.size).toBe(0);
    expect(picked.s.has(a)).toBe(false);
  });

  it("disposes nested derives when their owner re-runs", () => {
    const outer = state(0);
    const inner = state(0);
    let runs = 0;
    derive(() => {
      outer.value;
      derive(() => (inner.value, runs++));
    });

    outer.value = 1;
    runs = 0;
    inner.value = 1;

    expect(runs).toBe(1);
  });

  it("lets a derive read its own previous value", () => {
    const on = state(false);
    const add = state(1);
    let total: State<number> | undefined;
    total = derive(
      () => (total ? total.value : 0) + (on.value ? add.value : 0),
    );

    on.value = true;
    add.value = 2;

    expect(total.value).toBe(3);
  });

  it("keeps a derive's last value when it throws, then recovers", () => {
    const n = state(1);
    const inverse = derive(() => {
      if (n.value === 0) throw new Error("zero");
      return 1 / n.value;
    });
    const p = h("p", null, inverse);

    expect(() => (n.value = 0)).toThrow("zero");
    expect(p.textContent).toBe("1");
    n.value = 4;
    expect(p.textContent).toBe("0.25");
  });

  it("re-runs when a derive it reads writes a state it read before", () => {
    const x = state(0);
    const a = state(0);
    const positive = derive(() => x.value >= 0);
    const copy = derive(() => {
      a.value = x.value;
      return 0;
    });
    const sum = derive(() => a.value + copy.value + (positive.value ? 0 : 1));

    x.value = 7;

    expect(sum.value).toBe(7);
  });
});
