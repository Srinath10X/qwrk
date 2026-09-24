# What is Qwrk?

**Qwrk** is a tiny, reactive JavaScript micro-framework. It gives you full control over UI reactivity without a virtual DOM or heavy abstractions.

It's not a UI library like React or Vue. It's a lightweight reactive core that lets you:

- Create **reactive state** with [`state()`](/api/state)
- Respond to **state changes** with [`effect()`](/api/effect)
- Build **real DOM elements** with JSX or [`createElement()`](/api/create-element)

Qwrk is heavily inspired by [Solid](https://www.solidjs.com/) and [Preact](https://preactjs.com/).

## How it works

A component is a plain function that runs **once** and returns real DOM nodes. There is no re-rendering: when a state changes, only the text or attribute bound to it updates.

```jsx
import { state } from "qwrk";

function Counter() {
  const count = state(0);

  return <button onClick={() => count.value++}>count is {count}</button>;
}

document.getElementById("root").append(Counter());
```

Clicking the button changes `count.value`, and Qwrk updates the button's text in place. `Counter` itself never runs again.

Think of it as the foundation of a UI engine, built for hackers, minimalists, and anyone who wants raw power and speed in their hands.

Ready? Head to [Getting Started](/guide/getting-started).
