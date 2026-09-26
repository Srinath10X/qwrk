# derive()

Creates a [state](/api/state) whose value is computed from other states. It recomputes whenever one of them is written.

```ts
function derive<T>(fn: () => T, deps?: State<any>[]): State<T>;
```

- `fn`: computes the value. It runs once immediately, then again on every change.
- `deps` (optional): the states to watch. By default, `derive` watches every state whose `.value` `fn` reads.

## Usage

```jsx
import { state, derive } from "qwrk";

function Counter() {
  const count = state(1);
  const doubled = derive(() => count.value * 2);

  return (
    <button onClick={() => count.value++}>
      {count} x 2 = {doubled}
    </button>
  );
}
```

`fn` is an arrow function because `derive` needs a recipe it can re-run. `derive(count.value * 2)` would only pass the number.

## Dependencies

Dependencies are detected on every run, so reads behind a condition are picked up once they happen:

```js
const total = derive(() => (showTax.value ? price.value * 1.18 : price.value));
```

Reads inside JSX don't count. In `derive(() => (open.value ? <Counter /> : null))`, only `open` is a dependency: `Counter`'s own states update its DOM without rebuilding it.

Pass `deps` to watch specific states instead:

```js
const sum = derive(() => a.value + b.value, [a]); // ignores writes to b
```

## Conditional content

A derived value can be an element, so it can show or hide content:

```jsx
const open = state(false);
const panel = derive(() => (open.value ? <p>Details</p> : null));

<div>
  <button onClick={() => (open.value = !open.value)}>Toggle</button>
  {panel}
</div>;
```

Every change calls `fn` again, so the element is created fresh each time.

## Lists

Return an array to render a list:

```jsx
const todos = state(["Write docs", "Ship it"]);
const items = derive(() => todos.value.map((todo) => <li>{todo}</li>));

<ul>{items}</ul>;

todos.value.push("Celebrate"); // re-renders the list
```

`todos.value.push(...)`, `splice(...)` and other in-place changes update it too. See [arrays and objects](/api/state#arrays-and-objects).

Each change rebuilds every item, so keep derived lists to a reasonable size.
