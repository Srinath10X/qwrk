import { describe, expect, it, vi } from "vitest";
import { derive, state } from "../dist/index.js";

describe("state", () => {
  it("notifies with the new and old value on every change", () => {
    const count = state(0);
    const fn = vi.fn();
    count.effect(fn);

    count.value = 1;
    count.value = 1;

    expect(fn.mock.calls).toEqual([[1, 0]]);
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

  it("never wraps a state stored in a state", () => {
    const label = state("a");
    const rows = state([{ label }]);
    const outer = vi.fn();
    const inner = vi.fn();
    rows.effect(outer);
    label.effect(inner);

    expect(rows.value[0].label).toBe(label);
    rows.value[0].label.value = "b";

    expect(outer).not.toHaveBeenCalled();
    expect(inner).toHaveBeenCalledOnce();
  });

  it("finds raw objects and proxies", () => {
    const item = { id: 1 };
    const list = state<{ id: number }[]>([]);
    list.value.push(item, { id: 2 }, item);

    expect(list.value.includes(item)).toBe(true);
    expect(list.value.indexOf(item)).toBe(0);
    expect(list.value.lastIndexOf(item)).toBe(2);
    expect(list.value.lastIndexOf(item, 1)).toBe(0);
    expect(list.value.indexOf(list.value[1])).toBe(1);
    expect(list.value[0]).toBe(list.value[2]);
  });

  it("finds items after assigning an array built from proxies", () => {
    const a = { id: 1 };
    const list = state([a, { id: 2 }]);
    const first = list.value[0];
    list.value = list.value.filter((item) => item.id !== 2);

    expect(list.value[0]).toBe(first);
    expect(list.value.indexOf(a)).toBe(0);
    expect(list.value.includes(first)).toBe(true);
  });

  it("skips writes of an equal primitive", () => {
    const count = state(1);
    const nan = state(NaN);
    const fn = vi.fn();
    count.effect(fn);
    nan.effect(fn);

    count.value = 1;
    nan.value = NaN;

    expect(fn).not.toHaveBeenCalled();
  });

  it("skips deep writes of an equal value, not new keys or deletes", () => {
    const obj = state<Record<string, unknown>>({ n: 1 });
    const fn = vi.fn();
    obj.effect(fn);

    obj.value.n = 1;
    delete obj.value.missing;
    expect(fn).not.toHaveBeenCalled();

    obj.value.added = undefined;
    delete obj.value.n;
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("doesn't notify when the same object is assigned again", () => {
    const tags = state(new Set<string>());
    const fn = vi.fn();
    tags.effect(fn);

    tags.value.add("a");
    tags.value = tags.value;

    expect(fn).not.toHaveBeenCalled();
  });

  it("tracks reads through a proxy captured outside the derive", () => {
    const todos = state([{ text: "a" }]);
    const todo = todos.value[0];
    const upper = derive(() => todo.text.toUpperCase());

    todo.text = "b";

    expect(upper.value).toBe("B");
  });
});
