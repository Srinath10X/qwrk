# Compiler

The `qwrk-vite` plugin compiles JSX into static templates plus fine-grained DOM bindings. Any expression reading `.value` becomes reactive automatically; no `derive()` needed in JSX.

::: tip 0.4 beta
The compiler ships with Qwrk 0.4: `npm i qwrk@next qwrk-vite@next`. See [Try the 0.4 beta](/guide/getting-started#try-the-0-4-beta).
:::

```jsx
<tr class={selected.value === row.id ? "danger" : ""}>
  <td>{row.label}</td>
</tr>
```

## Automatic reactivity

An expression in JSX that may read a state's `.value`, such as a call or a member access with `.value` in it, is wrapped in a binding that re-runs when what it read changes. The binding updates only its own text node or attribute:

```jsx
function Counter() {
  const count = state(0);
  const show = state(true);

  return (
    <>
      <p title={`${count.value} clicks`}>doubled: {count.value * 2}</p>
      {show.value && <p>Visible</p>}
    </>
  );
}
```

Plain values and member chains without `.value`, such as `{label}` or `{row.id}`, are passed as they are, and a state passed itself, `{count}`, is bound by the runtime, as without the compiler.

## What gets compiled

Static tags, text and attributes go into a hoisted template, parsed once and cloned with `cloneNode(true)`. Dynamic text, attributes and children become tracked bindings. `selected.value === row.id` rewrites to `selected.is(row.id)`, so only the two rows affected by a selection change re-run.

Components are called once, untracked, with their props. A component's own reads don't make the JSX around it re-run.

The Vite plugin compiles `.jsx` and `.tsx` files, and `.js`, `.mjs` and `.cjs` files outside `node_modules` that contain JSX. TypeScript in TSX stays as written for Vite to strip.

## Lists

A `.map()` call whose callback returns JSX compiles to a keyed list when it is called on a state, and to a plain `Array.prototype.map` otherwise:

```jsx
<ul>{todos.map((todo) => <li>{todo.text}</li>)}</ul>
```

`{todos.value.map(...)}` also stays in sync, but as one binding that rebuilds every row on each change. Call `.map()` on the state itself for keyed rows. See [Lists](/guide/lists).

## Events

Delegated events: `onClick={h}` stores `h` as `el.$$click` and registers one document listener per event name. Non-bubbling events (`focus`, `blur`, `mouseenter`, `mouseleave`, `load`, `error`, `scroll`) use `addEventListener` directly.

A handler that only uses constants of its component moves to the module, with the constant stored on the element, so a thousand rows share one function.

## Fallback

Spread props `{...p}`, dynamic tags and namespaced attributes fall back to `createElement` from `qwrk`. Without the compiler (plain `tsc`/esbuild with only the JSX setting) the runtime path keeps working, and `derive()` is still needed for reactivity there.

## esbuild

`qwrk-vite/esbuild` runs the same compiler as an esbuild plugin, for `.jsx` and `.tsx` files. It also sets esbuild's automatic JSX runtime to `qwrk` for anything the compiler leaves untouched:

```js
import * as esbuild from "esbuild";
import qwrk from "qwrk-vite/esbuild";

await esbuild.build({
  entryPoints: ["src/main.jsx"],
  bundle: true,
  plugins: [qwrk()],
});
```

## SVG components

An SVG file imports as a component that renders it inline, with props landing on its root:

```jsx
import GithubIcon from "@/assets/github.svg";

<GithubIcon class="icon" width={24} />;
```

With an asset query (`?url`, `?raw`) it stays a URL, as Vite handles it — use that for `<img src>`.
