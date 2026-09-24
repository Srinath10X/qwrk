# effect()

Runs a side effect once after the component is mounted, then again whenever one of its dependencies changes.

```ts
function effect(callback: () => void, deps?: unknown[]): void;
```

- `callback`: the side effect to run.
- `deps` (optional): an array of [states](/api/state). `callback` runs again after every write to any of them.

## Usage

```jsx
import { state, effect } from "qwrk";

function Counter() {
  const count = state(0);

  effect(() => {
    document.title = `Clicked ${count.value} times`;
  }, [count]);

  return <button onClick={() => count.value++}>Click</button>;
}

document.getElementById("root").append(Counter());
```

## When the first run happens

The first run is deferred until the component is in the page:

- If the page is still loading, it runs on `DOMContentLoaded`.
- Otherwise it runs on the next microtask, just after the synchronous `append(App())` that mounted it.

Without `deps`, the callback runs only that once.

::: warning
Qwrk has no unmount, so effects never clean up. An effect keeps running on dependency changes even after its elements are removed from the page.
:::
