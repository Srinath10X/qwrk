import { describe, expect, it, vi } from "vitest";
import { state } from "../dist/index.js";

describe("state", () => {
  it("notifies with the new and old value on every write", () => {
    const count = state(0);
    const fn = vi.fn();
    count.effect(fn);

    count.value = 1;
    count.value = 1;

    expect(fn.mock.calls).toEqual([
      [1, 0],
      [1, 1],
    ]);
  });

  it("stops notifying after unsubscribe", () => {
    const count = state(0);
    const fn = vi.fn();
    const stop = count.effect(fn);

    stop();
    count.value = 1;

    expect(fn).not.toHaveBeenCalled();
  });

  it("notifies once per in-place array change", () => {
    const list = state(["a", "b"]);
    const fn = vi.fn();
    list.effect(fn);

    list.value.push("c");
    list.value.splice(0, 1);
    list.value.sort();
    list.value[0] = "z";
    list.value.length = 1;

    expect(fn).toHaveBeenCalledTimes(5);
    expect([...list.value]).toEqual(["z"]);
  });

  it("notifies on nested object writes and deletes", () => {
    const user = state({ name: "a", tags: [] as string[], meta: { age: 1 } });
    const fn = vi.fn();
    user.effect(fn);

    user.value.name = "b";
    user.value.tags.push("x");
    user.value.meta.age = 2;
    delete (user.value as Partial<typeof user.value>).name;

    expect(fn).toHaveBeenCalledTimes(4);
    expect(JSON.stringify(user.value)).toBe('{"tags":["x"],"meta":{"age":2}}');
  });

  it("keeps proxy identity and returns the proxy from sort", () => {
    const list = state([2, 1]);

    expect(list.value).toBe(list.value);
    expect(list.value.sort()).toBe(list.value);
    expect(Array.isArray(list.value)).toBe(true);
  });

  it("stores assigned proxies unwrapped", () => {
    const a = state({ n: 1 });
    const b = state<{ n: number } | null>(null);
    const fn = vi.fn();
    a.effect(fn);

    b.value = a.value;
    b.value!.n = 2;

    expect(fn).not.toHaveBeenCalled();
    expect(a.value.n).toBe(2);
  });

  it("leaves Map, Date and DOM nodes unwrapped", () => {
    const map = new Map();
    const date = new Date();
    const node = document.createElement("p");

    expect(state(map).value).toBe(map);
    expect(state(date).value).toBe(date);
    expect(state(node).value).toBe(node);
  });
});
