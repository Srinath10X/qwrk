import { describe, expect, it, vi } from "vitest";
import { createElement as h, derive, fragment, state } from "../dist/index.js";
import { jsx, Fragment } from "../dist/jsx/runtime.js";

describe("children", () => {
  it("renders primitives, skips booleans and nullish", () => {
    const div = h("div", null, "a", 0, 1, null, undefined, true, false, [
      "b",
      ["c"],
    ]);
    expect(div.innerHTML).toBe("a01bc");
  });

  it("updates reactive text in place", () => {
    const count = state(0);
    const div = h("div", null, count);
    const text = div.firstChild;

    count.value = 5;

    expect(div.innerHTML).toBe("5");
    expect(div.firstChild).toBe(text);
  });

  it("renders live lists from a derive", () => {
    const todos = state(["a", "b"]);
    const ul = h(
      "ul",
      null,
      derive(() => todos.value.map((t) => h("li", null, t))),
    );

    todos.value.push("c");
    expect(ul.innerHTML).toBe("<li>a</li><li>b</li><li>c</li>");

    todos.value = [];
    expect(ul.innerHTML).toBe("");

    todos.value = ["z"];
    expect(ul.innerHTML).toBe("<li>z</li>");
  });

  it("swaps elements, fragments, arrays and null", () => {
    const view = state<unknown>(
      h(fragment, null, h("b", null, "1"), h("i", null, "2")),
    );
    const div = h("div", null, "[", view, "]");

    expect(div.innerHTML).toBe("[<b>1</b><i>2</i>]");
    view.value = h("p", null);
    expect(div.innerHTML).toBe("[<p></p>]");
    view.value = [h("hr", null), "x"];
    expect(div.innerHTML).toBe("[<hr>x]");
    view.value = null;
    expect(div.innerHTML).toBe("[]");
    view.value = "text";
    expect(div.innerHTML).toBe("[text]");
  });
});

describe("attributes", () => {
  it("maps aliases and booleans", () => {
    const el = h("label", {
      className: "a",
      htmlFor: "x",
      hidden: true,
      title: false,
      "data-id": 7,
    });
    expect(el.outerHTML).toBe(
      '<label class="a" for="x" hidden="" data-id="7"></label>',
    );
  });

  it("keeps reactive attributes in sync", () => {
    const disabled = state(true);
    const button = h("button", { disabled });

    disabled.value = false;
    expect(button.hasAttribute("disabled")).toBe(false);
  });

  it("sets value and checked as properties", () => {
    const text = state("hello");
    const done = state(false);
    const input = h("input", { value: text }) as HTMLInputElement;
    const box = h("input", {
      type: "checkbox",
      checked: done,
    }) as HTMLInputElement;

    input.value = "typed by user";
    text.value = "";
    done.value = true;

    expect(input.value).toBe("");
    expect(box.checked).toBe(true);
  });

  it("selects the matching option", () => {
    const select = h(
      "select",
      { value: "b" },
      h("option", { value: "a" }),
      h("option", { value: "b" }),
    );
    expect((select as HTMLSelectElement).value).toBe("b");
  });

  it("accepts style strings and objects", () => {
    const style = state<Record<string, string>>({
      backgroundColor: "red",
      "--gap": "4px",
    });
    const el = h("div", { style }) as HTMLElement;

    expect(el.style.backgroundColor).toBe("red");
    expect(el.style.getPropertyValue("--gap")).toBe("4px");

    style.value = { color: "blue" };
    expect(el.style.backgroundColor).toBe("");
    expect(el.style.color).toBe("blue");
    expect((h("p", { style: "color: red" }) as HTMLElement).style.color).toBe(
      "red",
    );
  });
});

describe("elements", () => {
  it("creates SVG tags in the SVG namespace", () => {
    const svg = h("svg", { viewBox: "0 0 20 20" }, h("circle", { r: 8 }));

    expect(svg.namespaceURI).toBe("http://www.w3.org/2000/svg");
    expect(svg.firstChild!.namespaceURI).toBe("http://www.w3.org/2000/svg");
    expect(svg.getAttribute("viewBox")).toBe("0 0 20 20");
    expect(h("a", null).namespaceURI).toBe("http://www.w3.org/1999/xhtml");
  });

  it("adds on* functions as listeners", () => {
    const onClick = vi.fn();
    const button = h("button", { onClick }) as HTMLButtonElement;

    button.click();

    expect(onClick).toHaveBeenCalledOnce();
  });

  it("calls components with props and children", () => {
    const Card = ({ title, children }: { title: string; children: unknown }) =>
      h("section", null, h("h2", null, title), children);

    expect(h(Card, { title: "T" }, "body").outerHTML).toBe(
      "<section><h2>T</h2>body</section>",
    );
  });

  it("returns fragments as DocumentFragment from the JSX runtime", () => {
    const App = () =>
      jsx(Fragment, { children: [jsx("h1", { children: "a" }), jsx("p", {})] });
    const root = document.createElement("div");

    root.append(jsx(App, {}));

    expect(root.innerHTML).toBe("<h1>a</h1><p></p>");
  });
});

describe("huge lists", () => {
  it("renders 200,000 children through h and through a state child", () => {
    const items = Array.from({ length: 200_000 }, (_, i) => i);
    expect(h("ul", null, items).childNodes.length).toBe(200_000);
    expect(h("ul", null, state(items)).childNodes.length).toBe(200_000);
  });

  it("accepts 200,000 children from the JSX runtime", () => {
    const items = Array.from({ length: 200_000 }, (_, i) => i);
    expect(jsx("ul", { children: items }).childNodes.length).toBe(200_000);
  });

  it("updates a state to 70,000 nodes, past happy-dom's spread limit", () => {
    const n = state(1);
    const ul = h(
      "ul",
      null,
      derive(() => Array.from({ length: n.value }, () => new Text())),
    );

    n.value = 70_000;

    expect(ul.childNodes.length).toBe(70_000);
  }, 20_000);
});
