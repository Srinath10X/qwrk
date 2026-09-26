# Compiler

The `qwrk-vite` plugin compiles JSX into static templates plus fine-grained DOM bindings. Any expression reading `.value` becomes reactive automatically; no `derive()` needed in JSX.

```jsx
<tr class={selected.value === row.id ? "danger" : ""}>
  <td>{row.label}</td>
</tr>
```

What gets compiled: static tags, text and attributes go into a hoisted template cloned with `cloneNode(true)`. Dynamic text, attributes and children become tracked bindings. `selected.value === row.id` rewrites to `selected.is(row.id)`, so only the two rows affected by a selection change re-run.

Delegated events: `onClick={h}` stores `h` as `el.$$click` and registers one document listener per event name. Non-bubbling events (`focus`, `blur`, `mouseenter`, `mouseleave`, `load`, `error`, `scroll`) use `addEventListener` directly.

Fallback: spread props `{...p}`, dynamic tags and namespaced attributes fall back to `createElement` from `qwrk`. Without the compiler (plain `tsc`/esbuild with only the JSX setting) the runtime path keeps working, and `derive()` is still needed for reactivity there.

Using esbuild directly:

```js
import { qwrkEsbuild } from "qwrk-vite/esbuild";

esbuild.build({ plugins: [qwrkEsbuild()] });
```
