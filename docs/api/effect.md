# effect()

Runs a side effect once after the component is mounted, then again whenever a state it depends on changes.

```ts
function effect(callback: () => void, deps?: unknown[]): () => void;
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

Effects run after derives settle and the DOM is updated, before the write that triggered them returns.

An effect that writes a state it reads doesn't trigger itself again, so `effect(() => { if (count.value > 10) count.value = 10; })` is safe.

## When the first run happens

The first run is deferred until the component is in the page:

- If the page is still loading, it runs on `DOMContentLoaded`.
- Otherwise it runs on the next microtask, just after the synchronous `append(<App />)` that mounted it.

## Stopping

`effect()` returns a function that stops it:

```js
const stop = effect(() => console.log(count.value));

stop(); // no more runs
```

An effect also stops on its own in two cases:

- An effect created while a derive runs, such as in a component a derive renders (a list item, conditional content), stops when that derive runs again. See [Ownership](/api/derive#ownership).
- An effect or `.effect()` created while another effect or `.effect()` callback runs, including in a component it appends, stops when the outer one re-runs. If the outer one never runs again (`effect(fn, [])`, or one that stopped itself before creating it), the inner one lives until you stop it.

Derives created while an effect runs don't stop with it: like any derive rendered in the page, they keep updating for as long as their DOM exists.

::: warning
Any other effect lives until you stop it, even after its component leaves the page. An effect is a side effect you asked for, so Qwrk never drops it silently.
:::

## Errors

An effect that throws doesn't stop the others: every subscriber still runs, and the first error is rethrown by the write that triggered it.

Two effects that keep writing each other's states would never settle, so after 1000 rounds the write throws `Error("qwrk: update loop")` instead of hanging.
