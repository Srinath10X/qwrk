import { describe, expect, it, vi } from "vitest";
import { createElement as h, derive, effect, state } from "../dist/index.js";
import {
  attr,
  component,
  delegate,
  equals,
  group,
  insert,
  map,
  template,
} from "../dist/internal.js";

const tick = () => new Promise((resolve) => setTimeout(resolve));

describe("template", () => {
  it("clones the parsed element", () => {
    const row = template('<tr class="a"><td>1</td><td></td></tr>');
    const first = row() as HTMLElement;
    const second = row() as HTMLElement;

    expect(first.outerHTML).toBe('<tr class="a"><td>1</td><td></td></tr>');
    expect(first).not.toBe(second);
    expect(first.ownerDocument).toBe(document);
  });

  it("creates SVG elements in the SVG namespace", () => {
    const circle = template('<circle r="4"></circle>', true)() as Element;
    const svg = template('<svg viewBox="0 0 2 2"><path></path></svg>')();

    expect(circle.namespaceURI).toBe("http://www.w3.org/2000/svg");
    expect(circle.getAttribute("r")).toBe("4");
    expect((svg.firstChild as Element).namespaceURI).toBe(
      "http://www.w3.org/2000/svg",
    );
  });
});

describe("insert", () => {
  it("inserts values before a marker", () => {
    const div = h("div", null, "a", h("b", null)) as HTMLElement;

    insert(div, ["x", 1, null], div.lastChild);
    insert(div, "y");

    expect(div.innerHTML).toBe("ax1<b></b>y");
  });

  it("keeps a function in sync, reusing the text node", () => {
    const count = state(1);
    const div = h("div", null, "<", ">") as HTMLElement;

    insert(div, () => count.value * 2, div.lastChild);
    const text = div.childNodes[1];
    count.value = 5;

    expect(div.textContent).toBe("<10>");
    expect(div.childNodes[1]).toBe(text);
  });

  it("swaps the nodes a function returns", () => {
    const view = state<string>("text");
    const div = h("div", null) as HTMLElement;

    insert(div, () =>
      view.value === "text"
        ? "t"
        : view.value === "list"
          ? [h("i", null), "x"]
          : h("p", null),
    );
    view.value = "list";
    expect(div.innerHTML).toBe("<i></i>x");
    view.value = "node";
    expect(div.innerHTML).toBe("<p></p>");
    view.value = "text";
    expect(div.innerHTML).toBe("t");
  });

  it("reads a state that a function returns", () => {
    const flag = state(true);
    const a = state("a");
    const b = state("b");
    const div = h("div", null) as HTMLElement;

    insert(div, () => (flag.value ? a : b));
    a.value = "A";
    expect(div.textContent).toBe("A");
    flag.value = false;
    expect(div.textContent).toBe("b");
  });

  it("renders functions and states nested in what a function returns", () => {
    const show = state(true);
    const count = state(0);
    const div = h("div", null, "[", "]") as HTMLElement;

    insert(
      div,
      () => (show.value ? ["n=", () => count.value, count] : "-"),
      div.lastChild,
    );
    count.value = 3;
    expect(div.textContent).toBe("[n=33]");
    show.value = false;
    expect(div.textContent).toBe("[-]");
    show.value = true;
    count.value = 4;
    expect(div.textContent).toBe("[n=44]");
  });

  it("stops what a function created when it runs again", async () => {
    const page = state(0);
    const tick1 = state(0);
    let runs = 0;
    const div = h("div", null) as HTMLElement;

    insert(div, () => {
      page.value;
      effect(() => (tick1.value, runs++));
      return derive(() => tick1.value);
    });
    await tick();
    page.value++;
    await tick();
    runs = 0;
    tick1.value++;
    await tick();

    expect(runs).toBe(1);
    expect(div.textContent).toBe("1");
  });

  it("hands what a function that reads no state created to its owner", async () => {
    const count = state(0);
    const seen: number[] = [];
    const div = h("div", null) as HTMLElement;

    insert(div, () => {
      effect(() => void seen.push(count.value));
      return "static";
    });
    await tick();
    count.value = 1;
    await tick();

    expect(seen).toEqual([0, 1]);
  });

  it("updates the DOM before effects run", async () => {
    const count = state(0);
    const div = h("div", null) as HTMLElement;
    const seen: string[] = [];
    insert(div, () => count.value);
    effect(() => {
      count.value;
      seen.push(div.textContent!);
    });
    await tick();

    count.value = 1;
    expect(seen).toEqual(["0", "1"]);
  });
});

describe("attr", () => {
  it("binds values, states and functions", () => {
    const title = state("a");
    const n = state(1);
    const el = document.createElement("div");

    attr(el, "id", "x");
    attr(el, "title", title);
    attr(el, "class", () => (n.value > 1 ? "big" : null));
    attr(el, "style", () => ({ width: n.value }));
    expect(el.outerHTML).toBe(
      '<div id="x" title="a" style="width: 1px;"></div>',
    );

    title.value = "b";
    n.value = 2;
    expect(el.getAttribute("title")).toBe("b");
    expect(el.className).toBe("big");
    expect(el.style.width).toBe("2px");
  });

  it("sets value and checked as properties", () => {
    const text = state("a");
    const input = document.createElement("input");

    attr(input, "value", () => text.value.toUpperCase());
    input.value = "typed";
    text.value = "b";

    expect(input.value).toBe("B");
  });
});

describe("delegate", () => {
  it("calls handlers from the target up, until one stops", () => {
    delegate(["click"]);
    const calls: string[] = [];
    const outer = document.createElement("div") as any;
    const inner = document.createElement("button") as any;
    outer.append(inner);
    document.body.append(outer);

    outer.$$click = function (this: Element, event: Event) {
      calls.push(
        `outer:${this.tagName}:${(event.currentTarget as Element).tagName}`,
      );
    };
    inner.$$click = (event: Event) =>
      calls.push(`inner:${(event.currentTarget as Element).tagName}`);
    inner.click();
    inner.$$click = (event: Event) => event.stopPropagation();
    inner.click();

    expect(calls).toEqual(["inner:BUTTON", "outer:DIV:DIV"]);
    outer.remove();
  });

  it("listens once per event name", () => {
    const spy = vi.spyOn(document, "addEventListener");
    delegate(["keydown", "keydown"]);
    delegate(["keydown"]);

    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });
});

describe("helpers", () => {
  it("calls components untracked, with the props", () => {
    const count = state(0);
    let runs = 0;
    const view = derive(() =>
      component((props: { n: number }) => (runs++, count.value + props.n), {
        n: 1,
      }),
    );

    count.value = 5;
    expect(view.value).toBe(1);
    expect(runs).toBe(1);
  });

  it("groups children in a fragment", () => {
    const count = state(0);
    const nodes = group(["a", () => count.value, h("b", null)]);
    const div = document.createElement("div");
    div.append(nodes);

    count.value = 2;
    expect(div.innerHTML).toBe("a2<b></b>");
  });

  it("maps arrays and states", () => {
    const items = state(["a", "b"]);
    const div = document.createElement("div");
    div.append(map(items, (item: string) => item.toUpperCase()));

    items.value.push("c");
    expect(div.textContent).toBe("ABC");
    expect(map([1, 2], (n: number) => n * 2)).toEqual([2, 4]);
  });

  it("compares a state by key, and anything else by .value", () => {
    const selected = state(2);

    expect(equals(selected, 2)).toBe(true);
    expect(equals({ value: 3 }, 3)).toBe(true);
    expect(equals({ value: 3 }, 2)).toBe(false);
  });
});
