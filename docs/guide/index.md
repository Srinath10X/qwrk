# What is Qwrk?

**Qwrk** is a tiny, reactive JavaScript micro-framework. It gives you full control over UI reactivity without a virtual DOM or heavy abstractions.

It's not a UI library like React or Vue. It's a lightweight reactive core that lets you:

- Create **reactive state** with [`state()`](/api/state), and values computed from it with [`derive()`](/api/derive)
- Respond to **state changes** with [`effect()`](/api/effect), and group writes with [`batch()`](/api/batch)
- Build **real DOM elements** with JSX or [`createElement()`](/api/create-element)
- Render **keyed lists** with [`.map()`](/guide/lists)
- **Compile JSX** into cloned templates and fine-grained bindings with the [compiler](/guide/compiler)

Qwrk is heavily inspired by [Solid](https://www.solidjs.com/) and [Preact](https://preactjs.com/).

## How it works

A component is a plain function that runs **once** and returns real DOM nodes. There is no re-rendering: when a state changes, only the text or attribute bound to it updates.

```jsx
import { state } from "qwrk";

function Counter() {
  const count = state(0);

  return <button onClick={() => count.value++}>count is {count}</button>;
}

document.getElementById("root").append(<Counter />);
```

Clicking the button changes `count.value`, and Qwrk updates the button's text in place. `Counter` itself never runs again.

The [compiler](/guide/compiler) goes further: it turns the static parts of your JSX into templates copied with `cloneNode`, and any expression that reads a `.value` updates on its own.

::: tip 0.4 is in beta
These docs describe Qwrk 0.4, published on the `next` tag. To try it, see [Try the 0.4 beta](/guide/getting-started#try-the-0-4-beta).
:::

Think of it as the foundation of a UI engine, built for hackers, minimalists, and anyone who wants raw power and speed in their hands.

Ready? Head to [Getting Started](/guide/getting-started).
