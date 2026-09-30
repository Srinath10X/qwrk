import { describe, expect, it, vi } from "vitest";
import { createElement as h, derive, effect, state } from "../dist/index.js";
import {
  attr,
  classIf,
  component,
  delegate,
  equals,
  fused,
  group,
  insert,
  map,
  template,
  text,
} from "../dist/internal.js";

const tick = () => new Promise((resolve) => setTimeout(resolve));

describe("template", () => {
  it("clones the parsed element", () => {
    const row = template('<tr class="a"><td>1</td><td></td></tr>');
    const first = row() as HTMLElement;
    const second = row() as HTMLElement;

    expect(first.outerHTML).toBe('<tr class="a"><td>1</td><td></td></tr>');
    expect(first).not.toBe(second);
    document.createElement("table").append(first);
    expect(first.ownerDocument).toBe(document);
  });

  it("starts clones in the page's document when told to adopt", () => {
    const link = template('<a href="x">x</a>', false, true)() as HTMLElement;

    expect(link.ownerDocument).toBe(document);
    expect(link.outerHTML).toBe('<a href="x">x</a>');
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

describe("text", () => {
  it("writes a state's text value, updating in place", () => {
    const label = state("a");
    const a = h("a", null) as HTMLElement;

    text(a, label);
    expect(a.textContent).toBe("a");

    label.value = "b";
    expect(a.textContent).toBe("b");
  });

  it("hands over to nodes when the state stops being text", () => {
    const view = state<unknown>("text");
    const div = h("div", null) as HTMLElement;

    text(div, view);
    view.value = [h("b", null, "x"), "y"];
    expect(div.innerHTML).toBe("<b>x</b>y");

    view.value = "again";
    expect(div.textContent).toBe("again");
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

  it("updates attributes before effects run", () => {
    const n = state(1);
    const el = document.createElement("div");
    const seen: string[] = [];
    n.effect(() => seen.push(`${el.title}|${el.className}`));
    attr(el, "title", () => `t${n.value}`);
    classIf(el, n, 2, "on", "off");

    n.value = 2;
    expect(seen).toEqual(["t2|on"]);
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

  it("passes the element's data after the event", () => {
    delegate(["click"]);
    const seen: unknown[] = [];
    const a = document.createElement("a") as any;
    document.body.append(a);

    a.$$click = (event: Event, data: unknown) => seen.push(event.type, data);
    a.$$clickData = 7;
    a.click();

    expect(seen).toEqual(["click", 7]);
    a.remove();
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

describe("fused", () => {
  it("sets the class and the text in one binding", () => {
    const selected = state(1);
    const label = state("one");
    const tr = document.createElement("tr");
    const a = document.createElement("a");
    tr.append(a);

    fused(tr, selected, 1, "danger", "", a, label);
    expect(tr.className).toBe("danger");
    expect(a.textContent).toBe("one");

    selected.value = 2;
    expect(tr.className).toBe("");
    expect(a.textContent).toBe("one");

    label.value = "two";
    expect(a.textContent).toBe("two");
    expect(tr.className).toBe("");

    selected.value = 1;
    expect(tr.className).toBe("danger");
  });

  it("leaves the class off elements that never match", () => {
    const selected = state(1);
    const label = state("one");
    const tr = document.createElement("tr");
    const a = document.createElement("a");
    tr.append(a);

    fused(tr, selected, 2, "danger", "", a, label);
    expect(tr.hasAttribute("class")).toBe(false);
    expect(a.textContent).toBe("one");
  });

  it("hands non-text labels to a full slot", () => {
    const selected = state(1);
    const label = state<unknown>("one");
    const tr = document.createElement("tr");
    const a = document.createElement("a");
    tr.append(a);

    fused(tr, selected, 1, "danger", "", a, label);
    expect(a.textContent).toBe("one");

    const el = document.createElement("b");
    label.value = el;
    expect(a.firstChild).toBe(el);

    selected.value = 2;
    expect(tr.className).toBe("");
    expect(a.firstChild).toBe(el);

    label.value = "three";
    expect(a.textContent).toBe("three");
  });

  it("stops the slot of a handed over label with its owner", () => {
    const show = state(true);
    const label = state<unknown>("one");
    const seen: string[] = [];
    const a = document.createElement("a");
    const div = document.createElement("div");

    insert(div, () => {
      if (show.value) text(a, label);
      return null;
    });
    label.value = h("b", null, "x");
    label.value = "two";
    seen.push(a.textContent!);
    show.value = false;
    label.value = "three";
    seen.push(a.textContent!);

    expect(seen).toEqual(["two", "two"]);
  });
});
