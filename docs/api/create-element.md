# createElement()

The function JSX compiles to. You rarely call it yourself, but it lets you use Qwrk without a JSX build step.

```ts
function createElement(
  tag: string | Component | typeof fragment,
  props: Record<string, any> | null,
  ...children: unknown[]
): Node;
```

- A **string** tag creates an HTML element, with the [attribute and event rules](/guide/components#attributes) that JSX uses.
- A **function** tag is called as a component with `{ ...props, children }`.
- **`fragment`** returns the children in a `DocumentFragment`.

## Without JSX

```js
import { state, createElement as h, fragment } from "qwrk";

const count = state(0);

const app = h(
  fragment,
  null,
  h("h1", null, "Count: ", count),
  h("button", { onClick: () => count.value++ }, "Increment"),
);

document.getElementById("root").append(app);
```

## JSX runtime

Bundlers configured with `jsxImportSource: "qwrk"` import `jsx`, `jsxs` and `Fragment` from `qwrk/jsx-runtime` automatically. These wrap `createElement`, so the output is the same.
