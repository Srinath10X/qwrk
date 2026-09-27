import { describe, expect, it } from "vitest";
import { compile } from "../dist/compile.js";

/** Compiles `source` and returns the code without the import lines. */
function output(source: string, id = "app.jsx") {
  const result = compile(source, id);
  if (!result) throw Error("nothing compiled");
  return result.code;
}

describe("compile", () => {
  it("leaves modules without JSX alone", () => {
    expect(compile("const a = 1 < 2;", "a.jsx")).toBeNull();
    expect(compile("const a = [1].map((n) => n * 2);", "a.js")).toBeNull();
    expect(compile("const a = <div>;", "broken.jsx")).toBeNull();
  });

  it("clones a static tree from one template", () => {
    const code = output(
      `const a = <div id="a" class='b "c"'>Tom &amp; Jerry<br/><img alt="x" /></div>;`,
    );

    expect(code).toContain(
      `_$template("<div id=\\"a\\" class=\\"b &quot;c&quot;\\">Tom &amp; Jerry<br><img alt=\\"x\\"></div>")`,
    );
    expect(code).toContain("const a = _tmpl$1();");
    expect(code).toContain(
      'import { template as _$template } from "qwrk/internal";',
    );
  });

  it("reuses a template used twice", () => {
    const code = output(`const a = <p>x</p>; const b = <p>x</p>;`);
    expect(code.match(/_\$template\(/g)).toHaveLength(1);
  });

  it("wraps expressions that may read .value in thunks", () => {
    const code = output(
      `const a = <p title={user.name} data-n={n.value}>{count.value * 2}{label}{items.length}{f()}</p>;`,
    );

    expect(code).toContain('_$attr(_el$2, "title", user.name);');
    expect(code).toContain('_$attr(_el$2, "data-n", () => n.value);');
    expect(code).toContain("_$insert(_el$2, () => count.value * 2);");
    expect(code).toContain("_$insert(_el$2, label);");
    expect(code).toContain("_$insert(_el$2, items.length);");
    expect(code).toContain("_$insert(_el$2, () => f());");
  });

  it("walks to dynamic nodes, with markers between texts", () => {
    const code = output(
      `const a = <ul><li>a</li><li>x{b}y<i>{c}</i></li></ul>;`,
    );

    expect(code).toContain("<ul><li>a</li><li>x<!>y<i></i></li></ul>");
    expect(code).toContain(
      "_el$3 = _el$2.firstChild.nextSibling, _el$4 = _el$3.firstChild.nextSibling, _el$5 = _el$4.nextSibling.nextSibling;",
    );
    expect(code).toContain(
      "_$insert(_el$3, b, _el$4); _$text(_el$5, c); _el$4.remove();",
    );
  });

  it("rewrites a.value === b to a keyed comparison inside thunks", () => {
    const code = output(
      `const a = <tr class={selected.value === row.id ? "on" : ""} hidden={row.id !== store.sel.value} onClick={() => selected.value === 1} />;`,
    );

    expect(code).toContain('_$classIf(_el$2, selected, row.id, "on", "");');
    expect(code).toContain("() => !_$equals(store.sel, row.id)");
    expect(code).toContain("$$click = () => selected.value === 1;");
  });

  it("keeps a call in the key on the generic comparison path", () => {
    const code = output(
      `const a = <tr class={selected.value === mark(row.id) ? "on" : ""} other={selected.value === row.id ? "x" : "y"} />;`,
    );

    expect(code).toContain(
      '() => _$equals(selected, mark(row.id)) ? "on" : ""',
    );
    expect(code).not.toContain("_$classIf");
  });

  it("delegates bubbling events and listens to the others", () => {
    const code = output(
      `const a = <input onInput={(e) => set(e)} onKeyDown={down} onFocus={focus} onClick="alert(1)" />;`,
    );

    expect(code).toContain("_el$2.$$input = (e) => set(e);");
    expect(code).toContain("_el$2.$$keydown = down;");
    expect(code).toContain('_el$2.addEventListener("focus", focus);');
    expect(code).toContain('onClick=\\"alert(1)\\"');
    expect(code).toContain('_$delegate(["input","keydown"]);');
  });

  it("calls components with props, and children in an array", () => {
    const code = output(
      `const a = <Card title="t" n={1} {...rest} key="k" ui:x="1">text {name} {n.value}<b /><>f</></Card>;`,
    );

    expect(code).toContain(
      '_$component(Card, { title: "t", n: 1, ...rest, "ui:x": "1", children: ["text ", name, " ", () => n.value, _tmpl$1(), _$group(["f"])] })',
    );
    expect(output(`const a = <ui.Button />;`)).toContain(
      "_$component(ui.Button, { children: [] })",
    );
  });

  it("returns fragments as a group", () => {
    expect(output(`const a = <>a{b}<i /></>;`)).toContain(
      '_$group(["a", b, _tmpl$1()])',
    );
  });

  it("parses SVG elements inside <svg>", () => {
    const code = output(
      `const a = <svg viewBox="0 0 1 1"><circle r={r.value} /></svg>; const b = <g><path d="M0" /></g>;`,
    );

    expect(code).toContain(
      `_$template("<svg viewBox=\\"0 0 1 1\\"><circle></circle></svg>")`,
    );
    expect(code).toContain(
      `_$template("<g><path d=\\"M0\\"></path></g>", true)`,
    );
  });

  it("falls back to createElement for spreads and namespaced names", () => {
    const code = output(
      `const a = <div><p {...props} class="c">{x.value}</p><use xlink:href="#a" /></div>;`,
    );

    expect(code).toContain('import { createElement as _$h } from "qwrk";');
    expect(code).toContain(
      '_$h("p", { ...props, class: "c", }, () => x.value)',
    );
    expect(code).toContain('_$h("use", { "xlink:href": "#a", })');
  });

  it("keeps TypeScript in TSX", () => {
    const code = output(
      `const a = <p title={name as string}>{(count as State<number>).value}{items.map((i: Item) => <i>{i.name!}</i>)}</p>;`,
      "app.tsx",
    );

    expect(code).toContain('_$attr(_el$2, "title", name as string);');
    expect(code).toContain("() => (count as State<number>).value");
    expect(code).toContain("_$map(items, (i: Item) =>");
  });

  it("rewrites .map() with a JSX callback anywhere in the module", () => {
    const code = output(
      `const rows = data.map((row) => <Row row={row} />); const nums = data.map((n) => n * 2);`,
    );

    expect(code).toContain("const rows = _$map(data, (row) => _$component(Row");
    expect(code).toContain("const nums = data.map((n) => n * 2);");
  });

  it("uses createElement for JSX that awaits", () => {
    const code = output(
      `async function f() { return <p class={await c}>{await t}</p>; }`,
    );
    expect(code).toContain('_$h("p", { class: await c, }, await t)');
  });

  it("splits markup the HTML parser would move", () => {
    const code = output(`const a = <table><tr><td>{x}</td></tr></table>;`);
    expect(code).toContain('_$template("<table></table>")');
    expect(code).toContain('_$template("<tr><td></td></tr>")');
  });

  it("inserts the header after directives, with a source map", () => {
    const result = compile(
      `"use client";\nexport const a = <p>{x}</p>;`,
      "app.jsx",
    )!;

    expect(result.code.startsWith('"use client";\nimport')).toBe(true);
    expect(result.map.sources).toEqual(["app.jsx"]);
    expect(result.map.mappings).not.toBe("");
  });
});
