# effect()

Runs a side effect once after the component is mounted, then again whenever a state it depends on changes.

```ts
function effect(callback: () => void, deps?: unknown[]): void;
```

- `callback`: the side effect to run.
- `deps` (optional): the [states](/api/state) to watch. By default, `effect` watches every state whose `.value` `callback` reads.

## Usage

```jsx
import { state, effect } from "qwrk";

function Counter() {
  const count = state(0);

  effect(() => {
    document.title = `Clicked ${count.value} times`;
  });

  return <button onClick={() => count.value++}>Click</button>;
}

document.getElementById("root").append(<Counter />);
```

## Dependencies

| Call | Runs |
| --- | --- |
| `effect(fn)` | after mount, then whenever a state `fn` read changes |
| `effect(fn, [a, b])` | after mount, then whenever `a` or `b` changes |
| `effect(fn, [])` | once, after mount |

Dependencies are detected on every run, like [`derive()`](/api/derive#dependencies).

An effect that writes a state it reads doesn't trigger itself again, so `effect(() => { if (count.value > 10) count.value = 10; })` is safe.

## When the first run happens

The first run is deferred until the component is in the page:

- If the page is still loading, it runs on `DOMContentLoaded`.
- Otherwise it runs on the next microtask, just after the synchronous `append(<App />)` that mounted it.

::: warning
Qwrk has no unmount, so effects never clean up. An effect keeps running on dependency changes even after its elements are removed from the page.
:::
