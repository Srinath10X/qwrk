// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { both } from "./harness.js";

/**
 * Each case runs the same module compiled and through the runtime
 * `createElement` path, and expects the same DOM after mounting and after
 * each step.
 */
const cases: Record<string, string> = {
  "static markup, entities and whitespace": `
    export default () => ({
      node: (
        <div id="a" class="b c" data-x="1" hidden title={"t"} aria-label={\`l\`} tabIndex={2}>
          Hello &amp; welcome,&nbsp;friend &#169; &#x41; &unknown;
          <span>  a  </span>{" "}
          <b>{1}{true}{null}{false}{undefined}{"x"}{"<i>&"}</b>
          <br />
          <label htmlFor="n" className="l">
            multi
            line   text
          </label>
          <img src="a.png" alt='q"uote &lt;' draggable={false} />
          {/* comment */}
        </div>
      ),
    });
  `,

  "states as children and attributes": `
    import { state } from "qwrk";
    export default () => {
      const count = state(1);
      const title = state("t");
      const disabled = state(false);
      return {
        node: (
          <p title={title} class="x">
            {count} items, {count} again
            <button disabled={disabled}>{title}</button>
          </p>
        ),
        steps: [
          () => (count.value = 2),
          () => {
            title.value = "u";
            disabled.value = true;
          },
          () => (disabled.value = false),
        ],
      };
    };
  `,

  "derives as children and attributes": `
    import { derive, state } from "qwrk";
    export default () => {
      const n = state(1);
      const view = state("text");
      return {
        node: (
          <section data-n={derive(() => n.value * 2)}>
            a{derive(() => n.value + 1)}b
            {derive(() =>
              view.value === "text" ? "plain" : view.value === "list" ? [<i>1</i>, "2"] : <hr />,
            )}
            <em>{derive(() => (n.value > 2 ? null : n.value))}</em>
          </section>
        ),
        steps: [
          () => (n.value = 3),
          () => (view.value = "list"),
          () => (view.value = "node"),
          () => {
            n.value = 1;
            view.value = "text";
          },
        ],
      };
    };
  `,

  "keyed lists with static siblings": `
    import { state } from "qwrk";
    export default () => {
      const todos = state([{ t: "a" }, { t: "b" }]);
      return {
        node: (
          <ul>
            <li>first</li>
            {todos.map((todo) => (
              <li class="item">{todo.t}</li>
            ))}
            <li>last</li>
          </ul>
        ),
        steps: [
          () => todos.value.push({ t: "c" }),
          () => todos.value.reverse(),
          () => todos.value.splice(1, 1),
          () => (todos.value = []),
          () => (todos.value = [{ t: "x" }]),
        ],
      };
    };
  `,

  "delegated and direct events": `
    import { state } from "qwrk";
    export default () => {
      const count = state(0);
      const log = state("");
      function onKey(event) {
        log.value += event.currentTarget.tagName + event.key;
      }
      return {
        node: (
          <div onClick={() => (log.value += "d")}>
            <button onClick={() => count.value++}>{count}</button>
            <span onClick={(event) => (event.stopPropagation(), (log.value += "s"))}>s</span>
            <input onKeyDown={onKey} onFocus={() => (log.value += "f")} />
            <p onMouseEnter={() => (log.value += "e")}>{log}</p>
          </div>
        ),
        steps: [
          (root) => root.querySelector("button").click(),
          (root) => root.querySelector("span").click(),
          (root) =>
            root.querySelector("input").dispatchEvent(
              new KeyboardEvent("keydown", { key: "k", bubbles: true }),
            ),
          (root) => root.querySelector("input").dispatchEvent(new FocusEvent("focus")),
          (root) => root.querySelector("p").dispatchEvent(new MouseEvent("mouseenter")),
        ],
      };
    };
  `,

  "row handlers that read a row's constant": `
    import { state } from "qwrk";
    export default () => {
      const selected = state(0);
      const log = state("");
      const rows = state([{ id: 1 }, { id: 2 }, { id: 3 }]);
      function Row({ row }) {
        const id = row.id;
        let clicks = 0;
        return (
          <li>
            <a onClick={() => (selected.value = id)}>{id}</a>
            <s>{selected}</s>
            <b onClick={(event) => (log.value += event.type + id + row.id)}>b</b>
            <u onClick={() => (log.value += ++clicks)}>u</u>
            <i onClick={() => rows.value.splice(rows.value.findIndex((r) => r.id === id), 1)}>-</i>
          </li>
        );
      }
      return {
        node: (
          <div>
            <p>{log}</p>
            <ul>{rows.map((row) => <Row row={row} />)}</ul>
          </div>
        ),
        steps: [
          (root) => root.querySelectorAll("a")[1].click(),
          (root) => root.querySelectorAll("b")[2].click(),
          (root) => root.querySelectorAll("u")[0].click(),
          (root) => root.querySelectorAll("u")[0].click(),
          (root) => root.querySelectorAll("i")[0].click(),
          (root) => root.querySelectorAll("a")[0].click(),
        ],
      };
    };
  `,

  "components with props and children": `
    import { state } from "qwrk";
    function Card({ title, children }) {
      return (
        <section>
          <h2>{title}</h2>
          {children}
          <footer>{children.length}</footer>
        </section>
      );
    }
    function Pair() {
      return (
        <>
          <dt>term</dt>
          <dd>definition</dd>
        </>
      );
    }
    const ui = { Badge: ({ n }) => <b>{n}</b> };
    export default () => {
      const title = state("T");
      return {
        node: (
          <div>
            <Card title={title}>
              body <i>text</i>
              <ui.Badge n={2} key="k" />
            </Card>
            <Card title="empty" />
            <dl>
              <Pair />
            </dl>
          </div>
        ),
        steps: [() => (title.value = "U")],
      };
    };
  `,

  "components that always get string props": `
    import { state } from "qwrk";
    function Button({ id, text, kind: type, onClick }) {
      return (
        <button id={id} type={type} data-id={id} onClick={onClick}>
          {text}
        </button>
      );
    }
    function Label({ text }) {
      return <span title={text}>{text}</span>;
    }
    export default () => {
      const n = state(0);
      return {
        node: (
          <div>
            <Button id="a" text="A" kind="button" onClick={() => n.value++} />
            <Button id={"b"} text={\`B\`} kind="submit" onClick={() => n.value--} />
            <Button id="" text="" kind="reset" onClick={() => {}} />
            <Label text={n} />
            <p>{n}</p>
          </div>
        ),
        steps: [(root) => root.querySelector("button").click()],
      };
    };
  `,

  "fragments at the top and nested": `
    import { state } from "qwrk";
    export default () => {
      const n = state(1);
      return {
        node: (
          <>
            <h1>a</h1>
            <>
              b<i>{n}</i>
              <>c</>
            </>
            {n}
          </>
        ),
        steps: [() => (n.value = 2)],
      };
    };
  `,

  "SVG trees and SVG components": `
    import { state } from "qwrk";
    function Dot({ r }) {
      return <circle r={r} cx="1" />;
    }
    export default () => {
      const r = state(2);
      return {
        node: (
          <div>
            <svg viewBox="0 0 10 10" preserveAspectRatio="none" class="icon">
              <g fill="red" stroke-width="2">
                <path d="M0 0L1 1" />
                <Dot r={r} />
                <text x="1">label</text>
              </g>
              <foreignObject width="5" height="5">
                <p>html</p>
              </foreignObject>
              <a href="#x">
                <rect width="1" height="1" />
              </a>
            </svg>
            <Dot r={3} />
          </div>
        ),
        steps: [() => (r.value = 4)],
      };
    };
  `,

  "spread props falling back": `
    import { state } from "qwrk";
    export default () => {
      const title = state("a");
      const props = { id: "p", title, "data-x": 1 };
      return {
        node: (
          <div>
            <p {...props} class="c">
              text <b>{title}</b>
            </p>
            <input {...{ type: "checkbox" }} checked={true} />
          </div>
        ),
        steps: [() => (title.value = "b")],
      };
    };
  `,

  "styles, classes and properties": `
    import { state } from "qwrk";
    export default () => {
      const width = state(10);
      const style = state({ color: "red", "--gap": "2px" });
      const text = state("hello");
      const done = state(false);
      return {
        node: (
          <form>
            <div style={style} class={text} />
            <div style="color: blue" />
            <input value={text} />
            <input type="checkbox" checked={done} />
            <textarea value={text} />
            <select value="b">
              <option value="a">A</option>
              <option value="b">B</option>
            </select>
          </form>
        ),
        steps: [
          () => {
            style.value = { width: 5 };
            text.value = "bye";
            done.value = true;
          },
          () => (width.value = 20),
        ],
      };
    };
  `,

  "markup the HTML parser would rearrange": `
    import { state } from "qwrk";
    export default () => {
      const n = state(1);
      return {
        node: (
          <div>
            <table>
              <tr>
                <td>{n}</td>
              </tr>
            </table>
            <table>
              <tbody>
                <tr>
                  <td>cell</td>
                  <th>head</th>
                </tr>
              </tbody>
            </table>
            <p>
              para <div>block</div> <span><p>inner</p></span>
            </p>
            <a href="#1">
              out <span><a href="#2">in</a></span>
            </a>
            <ul>
              <li>
                one <li>nested</li>
              </li>
            </ul>
            <h1>
              <h2>sub</h2>
            </h1>
            <select>
              <option>
                <b>bold</b>
              </option>
              <div>x</div>
            </select>
            <pre>{"\\nleading"}</pre>
            <textarea>{"text <b>"}</textarea>
            <title>a &lt; b</title>
            <style>{"a > b { color: red }"}</style>
            <br>child</br>
            <template>
              <p>t</p>
            </template>
          </div>
        ),
        steps: [() => (n.value = 2)],
      };
    };
  `,

  "dynamic children between static text": `
    import { state } from "qwrk";
    export default () => {
      const a = state("A");
      const list = [1, 2];
      return {
        node: (
          <p>
            x{a}y{a}
            {list}z{" "}
            {...list}
            <b />
            {a}
          </p>
        ),
        steps: [() => (a.value = "B")],
      };
    };
  `,

  "duplicate and aliased attributes": `
    import { state } from "qwrk";
    export default () => {
      const c = state("dyn");
      return {
        node: (
          <div>
            <p class="a" className="b" />
            <p class={c} className="static" />
            <p title="1" title="2" />
            <label className={c} htmlFor="x" />
          </div>
        ),
        steps: [() => (c.value = "next")],
      };
    };
  `,

  "function children and thunks passed through": `
    import { state } from "qwrk";
    function Show({ when, children }) {
      return <div>{() => (when.value ? children : "hidden")}</div>;
    }
    export default () => {
      const open = state(true);
      const n = state(1);
      return {
        node: (
          <Show when={open}>
            n={n}
            {() => n.value * 10}
          </Show>
        ),
        steps: [() => (n.value = 2), () => (open.value = false), () => (open.value = true)],
      };
    };
  `,
};

describe("compiled JSX matches the runtime", () => {
  for (const [name, source] of Object.entries(cases)) {
    it(name, async () => {
      const { compiled, uncompiled } = await both(source);
      expect(compiled).toEqual(uncompiled);
    });
  }
});

/**
 * Compiled code is reactive without `derive()`: each case compares compiled
 * code to the same code with `derive()`, run through the runtime.
 */
const reactive: Record<string, [string, string]> = {
  "text and attributes reading .value": [
    `
    import { state } from "qwrk";
    export default () => {
      const n = state(1);
      const user = state({ name: "a" });
      return {
        node: <p title={\`n\${n.value}\`} data-name={user.value.name}>{n.value * 2} {user.value.name}!</p>,
        steps: [() => n.value++, () => (user.value.name = "b"), () => (user.value = { name: "c" })],
      };
    };
    `,
    `
    import { derive, state } from "qwrk";
    export default () => {
      const n = state(1);
      const user = state({ name: "a" });
      return {
        node: (
          <p title={derive(() => \`n\${n.value}\`)} data-name={derive(() => user.value.name)}>
            {derive(() => n.value * 2)} {derive(() => user.value.name)}!
          </p>
        ),
        steps: [() => n.value++, () => (user.value.name = "b"), () => (user.value = { name: "c" })],
      };
    };
    `,
  ],

  "selection with a.value === b": [
    `
    import { state } from "qwrk";
    export default () => {
      const selected = state(1);
      const rows = state([1, 2, 3]);
      return {
        node: (
          <ul>
            {rows.map((id) => (
              <li class={selected.value === id ? "on" : ""} data-off={id !== selected.value}>
                {id}
              </li>
            ))}
          </ul>
        ),
        steps: [() => (selected.value = 3), () => (selected.value = 9)],
      };
    };
    `,
    `
    import { derive, state } from "qwrk";
    export default () => {
      const selected = state(1);
      const rows = state([1, 2, 3]);
      return {
        node: (
          <ul>
            {rows.map((id) => (
              <li
                class={derive(() => (selected.value === id ? "on" : ""))}
                data-off={derive(() => id !== selected.value)}
              >
                {id}
              </li>
            ))}
          </ul>
        ),
        steps: [() => (selected.value = 3), () => (selected.value = 9)],
      };
    };
    `,
  ],

  "conditional elements and plain array lists": [
    `
    import { state } from "qwrk";
    function Item({ text }) {
      return <li>{text}</li>;
    }
    export default () => {
      const show = state(true);
      const items = state(["a", "b"]);
      return {
        node: (
          <div>
            {show.value ? <b>yes</b> : <i>no</i>}
            <ul>{items.value.map((text) => <Item text={text} />)}</ul>
            {items.value.length > 2 && <p>many</p>}
          </div>
        ),
        steps: [
          () => (show.value = false),
          () => items.value.push("c"),
          () => (items.value = ["z"]),
        ],
      };
    };
    `,
    `
    import { derive, state } from "qwrk";
    function Item({ text }) {
      return <li>{text}</li>;
    }
    export default () => {
      const show = state(true);
      const items = state(["a", "b"]);
      return {
        node: (
          <div>
            {derive(() => (show.value ? <b>yes</b> : <i>no</i>))}
            <ul>{derive(() => items.value.map((text) => <Item text={text} />))}</ul>
            {derive(() => items.value.length > 2 && <p>many</p>)}
          </div>
        ),
        steps: [
          () => (show.value = false),
          () => items.value.push("c"),
          () => (items.value = ["z"]),
        ],
      };
    };
    `,
  ],

  "component children reading .value": [
    `
    import { state } from "qwrk";
    function Box({ children }) {
      return <div class="box">{children}</div>;
    }
    export default () => {
      const n = state(1);
      return {
        node: <Box>n is {n.value}</Box>,
        steps: [() => (n.value = 5)],
      };
    };
    `,
    `
    import { derive, state } from "qwrk";
    function Box({ children }) {
      return <div class="box">{children}</div>;
    }
    export default () => {
      const n = state(1);
      return {
        node: <Box>n is {derive(() => n.value)}</Box>,
        steps: [() => (n.value = 5)],
      };
    };
    `,
  ],
};

describe("compiled JSX is reactive without derive()", () => {
  for (const [name, [source, runtime]] of Object.entries(reactive)) {
    it(name, async () => {
      const { compiled, uncompiled } = await both(source, runtime);
      expect(compiled).toEqual(uncompiled);
    });
  }
});
