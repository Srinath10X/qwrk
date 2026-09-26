import { describe, expect, it } from "vitest";
import {
  batch,
  createElement as h,
  derive,
  effect,
  fragment,
  state,
} from "../dist/index.js";

interface Todo {
  text: string;
  done?: boolean;
}

const mount = () => new Promise((resolve) => setTimeout(resolve));

function todo(text: string): Todo {
  return { text };
}

function texts(parent: Node) {
  return [...parent.childNodes]
    .map((node) => node.textContent)
    .filter((text) => text !== "");
}

/** Renders `todos` as `<li>`s in a `<ul>`, counting the calls of `fn`. */
function render(todos: ReturnType<typeof state<Todo[]>>) {
  const calls: string[] = [];
  const ul = h(
    "ul",
    null,
    todos.map((todo) => (calls.push(todo.text), h("li", null, todo.text))),
  ) as HTMLUListElement;
  return { ul, calls };
}

/** Counts the insertions and removals of `parent`'s children while `fn` runs. */
function mutations(parent: Node, fn: () => void) {
  const observer = new MutationObserver(() => {});
  observer.observe(parent, { childList: true });
  fn();
  let inserted = 0;
  let removed = 0;
  for (const record of observer.takeRecords()) {
    inserted += record.addedNodes.length;
    removed += record.removedNodes.length;
  }
  observer.disconnect();
  return { inserted, removed };
}

describe("state.map", () => {
  it("renders the initial items once each", () => {
    const todos = state([todo("a"), todo("b"), todo("c")]);
    const { ul, calls } = render(todos);

    expect(ul.innerHTML).toBe("<li>a</li><li>b</li><li>c</li>");
    expect(calls).toEqual(["a", "b", "c"]);
  });

  it("adds, removes and keeps rows on push, unshift, pop, shift and splice", () => {
    const todos = state([todo("b"), todo("c")]);
    const { ul, calls } = render(todos);
    const [b, c] = ul.children;

    todos.value.push(todo("d"));
    todos.value.unshift(todo("a"));
    expect(texts(ul)).toEqual(["a", "b", "c", "d"]);
    expect(ul.children[1]).toBe(b);
    expect(ul.children[2]).toBe(c);

    todos.value.splice(2, 0, todo("x"), todo("y"));
    expect(texts(ul)).toEqual(["a", "b", "x", "y", "c", "d"]);
    todos.value.splice(1, 2);
    expect(texts(ul)).toEqual(["a", "y", "c", "d"]);
    todos.value.pop();
    todos.value.shift();
    expect(texts(ul)).toEqual(["y", "c"]);
    expect(ul.children[1]).toBe(c);
    expect(calls).toEqual(["b", "c", "d", "a", "x", "y"]);
  });

  it("swaps two rows with two moves, keeping every node", () => {
    const todos = state(
      Array.from({ length: 1000 }, (_, i) => todo(String(i))),
    );
    const { ul, calls } = render(todos);
    const before = [...ul.children];

    const counts = mutations(ul, () => {
      const rows = [...todos.value];
      [rows[1], rows[998]] = [rows[998], rows[1]];
      todos.value = rows;
    });

    const after = [...ul.children];
    expect(after[1]).toBe(before[998]);
    expect(after[998]).toBe(before[1]);
    for (let i = 0; i < 1000; i++) {
      if (i !== 1 && i !== 998) expect(after[i]).toBe(before[i]);
    }
    expect(counts).toEqual({ inserted: 2, removed: 2 });
    expect(calls).toHaveLength(1000);
  });

  it("swaps in place with writes in a batch", () => {
    const todos = state([todo("a"), todo("b"), todo("c"), todo("d")]);
    const { ul } = render(todos);
    const [a, b, c, d] = ul.children;

    const counts = mutations(ul, () =>
      batch(() => {
        const rows = todos.value;
        const first = rows[0];
        rows[0] = rows[2];
        rows[2] = first;
      }),
    );

    expect([...ul.children]).toEqual([c, b, a, d]);
    expect(counts).toEqual({ inserted: 2, removed: 2 });
  });

  it("removes one row with one removal and appends with one insertion", () => {
    const todos = state(Array.from({ length: 100 }, (_, i) => todo(`${i}`)));
    const { ul } = render(todos);

    const removal = mutations(ul, () => todos.value.splice(40, 1));
    const appending = mutations(ul, () => {
      todos.value = [...todos.value, todo("x"), todo("y")];
    });

    expect(removal).toEqual({ inserted: 0, removed: 1 });
    expect(appending).toEqual({ inserted: 2, removed: 0 });
    expect(texts(ul)).toHaveLength(101);
  });

  it("clears the parent at once, and refills it", () => {
    const todos = state([todo("a"), todo("b")]);
    const { ul, calls } = render(todos);

    const counts = mutations(ul, () => (todos.value = []));
    expect(ul.innerHTML).toBe("");
    expect(ul.childNodes).toHaveLength(2);
    expect(counts.removed).toBe(4);

    todos.value = [todo("c")];
    todos.value.push(todo("d"));
    expect(ul.innerHTML).toBe("<li>c</li><li>d</li>");
    expect(calls).toEqual(["a", "b", "c", "d"]);
  });

  it("reverses, sorts and filters with the same nodes", () => {
    const todos = state(["d", "b", "a", "e", "c"].map(todo));
    const { ul, calls } = render(todos);
    const nodes = new Map([...ul.children].map((li) => [li.textContent, li]));

    todos.value.reverse();
    expect(texts(ul)).toEqual(["c", "e", "a", "b", "d"]);
    todos.value.sort((x, y) => x.text.localeCompare(y.text));
    expect(texts(ul)).toEqual(["a", "b", "c", "d", "e"]);
    todos.value = todos.value.filter((t) => t.text !== "c");
    expect(texts(ul)).toEqual(["a", "b", "d", "e"]);

    for (const li of ul.children) expect(nodes.get(li.textContent)).toBe(li);
    expect(calls).toHaveLength(5);
  });

  it("rebuilds rows replaced with new objects", () => {
    const todos = state([todo("a"), todo("b")]);
    const { ul, calls } = render(todos);
    const [a] = ul.children;

    todos.value = [todo("a"), todo("b")];

    expect(ul.children[0]).not.toBe(a);
    expect(texts(ul)).toEqual(["a", "b"]);
    expect(calls).toEqual(["a", "b", "a", "b"]);
  });

  it("renders duplicate items as many times as they appear", () => {
    const x = todo("x");
    const y = todo("y");
    const todos = state([x, y, x]);
    const { ul } = render(todos);

    expect(texts(ul)).toEqual(["x", "y", "x"]);
    todos.value = [x, x, y, x];
    expect(texts(ul)).toEqual(["x", "x", "y", "x"]);
    todos.value = [y, x];
    expect(texts(ul)).toEqual(["y", "x"]);
    todos.value = [x, y, y, x, x];
    expect(texts(ul)).toEqual(["x", "y", "y", "x", "x"]);
  });

  it("keys primitives by value, duplicates included", () => {
    const list = state<(string | number)[]>(["a", 1, "a", 2]);
    const div = h(
      "div",
      null,
      list.map((item) => item),
    );

    expect(div.textContent).toBe("a1a2");
    list.value = [2, "a", "a", 1, 1];
    expect(div.textContent).toBe("2aa11");
    list.value = [];
    expect(div.textContent).toBe("");
  });

  it("gives each row the item's proxy, so changing it in place updates", () => {
    const todos = state([todo("a")]);
    const div = h(
      "div",
      null,
      todos.map((item) =>
        h(
          "p",
          null,
          derive(() => (item.done ? "done" : item.text)),
        ),
      ),
    );

    todos.value[0].done = true;
    expect(div.textContent).toBe("done");
  });

  it("renders rows that return fragments, text, states or nothing", () => {
    const todos = state([todo("a"), todo("b"), todo("c")]);
    const flag = state(false);
    const div = h(
      "div",
      null,
      todos.map((item) =>
        item.text === "a"
          ? h(fragment, null, h("i", null, "a"), h("b", null, "!"))
          : item.text === "b"
            ? derive(() => (flag.value ? h("u", null, "B") : "b"))
            : null,
      ),
    );

    expect(div.innerHTML).toBe("<i>a</i><b>!</b>b");
    flag.value = true;
    expect(div.innerHTML).toBe("<i>a</i><b>!</b><u>B</u>");
    todos.value.reverse();
    expect(div.innerHTML).toBe("<u>B</u><i>a</i><b>!</b>");
    todos.value.splice(1, 1);
    expect(div.innerHTML).toBe("<i>a</i><b>!</b>");
    todos.value.pop();
    expect(div.innerHTML).toBe("");
  });

  it("keeps static siblings in place", () => {
    const todos = state([todo("a"), todo("b")]);
    const ul = h(
      "ul",
      null,
      h("li", null, "first"),
      todos.map((item) => h("li", null, item.text)),
      h("li", null, "last"),
    );
    const check = (...middle: string[]) =>
      expect(texts(ul)).toEqual(["first", ...middle, "last"]);

    check("a", "b");
    todos.value.push(todo("c"));
    check("a", "b", "c");
    todos.value.unshift(todo("z"));
    check("z", "a", "b", "c");
    todos.value.reverse();
    check("c", "b", "a", "z");
    todos.value = [];
    check();
    todos.value = [todo("x"), todo("y")];
    check("x", "y");
    todos.value = [todo("n")];
    check("n");
  });

  it("renders nothing for null and undefined", () => {
    const todos = state<Todo[] | null>(null);
    const ul = h(
      "ul",
      null,
      todos.map((item) => h("li", null, item.text)),
    );

    expect(ul.innerHTML).toBe("");
    todos.value = [todo("a")];
    expect(ul.innerHTML).toBe("<li>a</li>");
    todos.value = null;
    expect(ul.innerHTML).toBe("");
  });

  it("renders nested lists", () => {
    const groups = state([{ name: "g1", items: ["a", "b"] }]);
    const div = h(
      "div",
      null,
      groups.map((group) =>
        h(
          "section",
          null,
          group.name,
          derive(() => group.items).map((item) => h("i", null, item)),
        ),
      ),
    );
    const [section] = div.children;

    groups.value[0].items.push("c");
    expect(div.innerHTML).toBe("<section>g1<i>a</i><i>b</i><i>c</i></section>");
    groups.value.push({ name: "g2", items: [] });
    expect(div.children[0]).toBe(section);
    expect(div.textContent).toBe("g1abcg2");
  });

  it("maps a derive's items as the derive returns them", () => {
    const todos = state([todo("a"), todo("b"), todo("c")]);
    const open = derive(() => todos.value.filter((t) => !t.done));
    const div = h(
      "div",
      null,
      open.map((item) =>
        h("p", { onClick: () => (item.done = true) }, item.text),
      ),
    );
    const [, b] = div.children;

    (div.children[0] as HTMLElement).click();
    expect(texts(div)).toEqual(["b", "c"]);
    expect(div.children[0]).toBe(b);
  });

  it("stops a removed row's effects and derives", async () => {
    const tick = state(0);
    const todos = state([todo("a"), todo("b")]);
    const runs: string[] = [];
    let derived = 0;
    h(
      "ul",
      null,
      todos.map((item) => {
        const { text } = item;
        effect(() => runs.push(text + tick.value));
        return h(
          "li",
          null,
          derive(() => (derived++, tick.value)),
        );
      }),
    );
    await mount();

    todos.value.shift();
    derived = 0;
    tick.value++;
    await mount();

    expect(runs).toEqual(["a0", "b0", "b1"]);
    expect(derived).toBe(1);
  });

  it("stops every row when the list's owner re-runs", async () => {
    const page = state(0);
    const tick = state(0);
    const todos = state([todo("a"), todo("b")]);
    let runs = 0;
    const div = h(
      "div",
      null,
      derive(() =>
        page.value === 0
          ? todos.map((item) => {
              effect(() => (tick.value, runs++));
              return h("p", null, item.text);
            })
          : "gone",
      ),
    );
    await mount();
    expect(div.textContent).toBe("ab");

    todos.value.push(todo("c"));
    await mount();
    page.value = 1;
    tick.value++;
    todos.value.push(todo("d"));
    await mount();

    expect(div.innerHTML).toBe("gone");
    expect(runs).toBe(3);
  });

  it("keeps a moved row's input value and the focus of rows that stay", () => {
    const todos = state([todo("a"), todo("b"), todo("c")]);
    const div = h(
      "div",
      null,
      todos.map((item) => h("input", { name: item.text }, null)),
    );
    document.body.append(div);
    const [a, b] = div.children as HTMLCollectionOf<HTMLInputElement>;
    b.value = "typed";
    a.focus();

    todos.value = [todos.value[1], todos.value[0], todos.value[2]];

    expect(div.children[0]).toBe(b);
    expect(b.value).toBe("typed");
    expect(document.activeElement).toBe(a);
    div.remove();
  });

  it("matches a random sequence of changes", () => {
    let seed = 1;
    const random = (max: number) => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return (seed >>> 8) % max;
    };
    let id = 0;
    const fresh = () => todo(`${id++}`);
    const expected: Todo[] = Array.from({ length: 10 }, fresh);
    const todos = state([...expected]);
    const ul = h(
      "ul",
      null,
      h("li", null, "<"),
      todos.map((item) => h("li", null, item.text)),
      h("li", null, ">"),
    );
    const nodes = new Map<Todo, Element>();
    const snapshot = () => {
      const children = [...ul.children].slice(1, -1);
      children.forEach((li, i) => nodes.set(expected[i], li));
    };
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
      () => {
        const copy = [...expected];
        const [moved] = copy.splice(random(copy.length || 1), 1);
        if (moved) copy.splice(random(copy.length + 1), 0, moved);
        return copy;
      },
    ];

    for (let step = 0; step < 5000; step++) {
      const next = ops[random(ops.length)]();
      if (next.length > 60) next.length = 30;
      todos.value = next;
      const children = [...ul.children].slice(1, -1);

      expect(texts(ul)).toEqual(["<", ...next.map((t) => t.text), ">"]);
      children.forEach((li, i) => {
        const node = nodes.get(next[i]);
        if (node && expected.includes(next[i])) expect(li).toBe(node);
      });
      expected.splice(0, expected.length, ...next);
      snapshot();
    }
  });

  it("matches a random sequence of changes with duplicates and fragments", () => {
    let seed = 7;
    const random = (max: number) => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return (seed >>> 8) % max;
    };
    const letters = ["a", "b", "c", "d", "e", "f"];
    let expected: string[] = [];
    const list = state<string[]>([]);
    const div = h(
      "div",
      null,
      "[",
      list.map((item) =>
        item === "a" || item === "b"
          ? h(fragment, null, item, h("i", null, "."))
          : item,
      ),
      "]",
    );
    const show = (items: string[]) =>
      `[${items
        .map((item) => (item === "a" || item === "b" ? `${item}.` : item))
        .join("")}]`;

    for (let step = 0; step < 3000; step++) {
      const next = [...expected];
      const count = random(4) + 1;
      for (let n = 0; n < count; n++) {
        const op = random(6);
        if (op < 2 && next.length < 20)
          next.splice(random(next.length + 1), 0, letters[random(6)]);
        else if (op === 2) next.splice(random(next.length || 1), 1);
        else if (op === 3) next.reverse();
        else next.sort(() => random(3) - 1);
      }
      expected = random(50) ? next : [];
      list.value = expected;

      expect(div.textContent).toBe(show(expected));
    }
  });

  it("works as the value of a derive", () => {
    const show = state(true);
    const todos = state([todo("a")]);
    const div = h(
      "div",
      null,
      "<",
      derive(() =>
        show.value ? todos.map((item) => h("b", null, item.text)) : "none",
      ),
      ">",
    );

    todos.value.push(todo("b"));
    todos.value.unshift(todo("z"));
    expect(div.innerHTML).toBe("&lt;<b>z</b><b>a</b><b>b</b>&gt;");
    show.value = false;
    expect(div.innerHTML).toBe("&lt;none&gt;");
    todos.value = [];
    show.value = true;
    todos.value.push(todo("c"));
    expect(div.innerHTML).toBe("&lt;<b>c</b>&gt;");
  });
});
