// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { state } from "../../qwrk-core/dist/index.js";
import { compiled } from "./harness.js";

interface Todo {
  text: string;
}

/** A seeded random generator, so failures reproduce. */
function generator(seed: number) {
  return (max: number) => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return (seed >>> 8) % max;
  };
}

describe("compiled keyed lists", () => {
  it("match a random sequence of changes, keeping each item's node", () => {
    const random = generator(3);
    const render = compiled(`
      import { state } from "qwrk";
      export default (todos) => (
        <ul>
          <li>{"<"}</li>
          {todos.map((item) => <li class={item.text}>{item.text}</li>)}
          <li>{">"}</li>
        </ul>
      );
    `);
    let id = 0;
    const fresh = (): Todo => ({ text: `t${id++}` });
    let expected: Todo[] = Array.from({ length: 10 }, fresh);
    const todos = state([...expected]);
    const ul: HTMLElement = render(todos);
    const nodes = new Map<Todo, Element>();
    const snapshot = () =>
      [...ul.children]
        .slice(1, -1)
        .forEach((li, i) => nodes.set(expected[i], li));
    snapshot();

    const ops: (() => Todo[])[] = [
      () => [...expected, ...Array.from({ length: random(5) }, fresh)],
      () => [...Array.from({ length: random(3) }, fresh), ...expected],
      () => expected.filter(() => random(4) > 0),
      () => {
        const copy = [...expected];
        copy.splice(random(copy.length + 1), random(3), fresh());
        return copy;
      },
      () => {
        const copy = [...expected];
        const i = random(copy.length || 1);
        const j = random(copy.length || 1);
        [copy[i], copy[j]] = [copy[j], copy[i]];
        return copy.filter(Boolean);
      },
      () => [...expected].reverse(),
      () => [...expected].sort(() => random(3) - 1),
      () => expected.map((item) => (random(5) ? item : fresh())),
      () => (random(10) ? expected.slice(random(3)) : []),
    ];

    for (let step = 0; step < 3000; step++) {
      const next = ops[random(ops.length)]();
      if (next.length > 60) next.length = 30;
      todos.value = next;
      const children = [...ul.children];

      expect(children.map((li) => li.textContent)).toEqual([
        "<",
        ...next.map((todo) => todo.text),
        ">",
      ]);
      children.slice(1, -1).forEach((li, i) => {
        expect(li.className).toBe(next[i].text);
        const node = nodes.get(next[i]);
        if (node && expected.includes(next[i])) expect(li).toBe(node);
      });
      expected = next;
      snapshot();
    }
  });

  it("re-render only the two rows a selection changes", () => {
    const { rows, selected, table, runs } = compiled(`
      import { state } from "qwrk";
      const runs = [];
      const selected = state(0);
      const rows = state(Array.from({ length: 1000 }, (_, id) => ({ id })));
      function mark(id) {
        runs.push(id);
        return id;
      }
      function Row({ row }) {
        return <tr class={selected.value === mark(row.id) ? "danger" : ""}><td>{row.id}</td></tr>;
      }
      export default { rows, selected, runs, table: <tbody>{rows.map((row) => <Row row={row} />)}</tbody> };
    `);
    expect(table.children).toHaveLength(1000);
    runs.length = 0;

    selected.value = 10;
    selected.value = 500;

    expect(runs.sort((a: number, b: number) => a - b)).toEqual([
      0, 10, 10, 500,
    ]);
    expect(table.querySelectorAll(".danger")).toHaveLength(1);
    expect(table.children[500].className).toBe("danger");
    rows.value = [];
    expect((selected as any).k.size).toBe(0);
  });
});
