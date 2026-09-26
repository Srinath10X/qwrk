# derive()

Creates a [state](/api/state) whose value is computed from other states. It recomputes when a state it depends on changes.

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

## Consistent updates

One change recomputes a derive at most once, after the derives it reads, so it never sees some of its dependencies updated and others not:

```js
const a = state(1);
const b = derive(() => a.value * 2);
const c = derive(() => a.value * 3);
const d = derive(() => `${b.value}+${c.value}`);

a.value = 2; // d recomputes once and only sees "4+6", never "4+3"
```

When the result equals the last one (compared with `Object.is`), what depends on the derive doesn't update. Arrays and plain objects always count as changed, because they may have been changed in place, as in `derive(() => nums.value.sort())`.

A derive that throws keeps its last value, and recomputes on the next change. A derive that reads its own `.value` gets its previous value.

## The derived value

The value is stored as `fn` returned it, not wrapped: `derived.value.push(x)` changes nothing reactive, so change the source states instead. Items that came from a state are still that state's proxies, so writing them updates the source:

```js
const active = derive(() => todos.value.filter((todo) => !todo.done));

active.value[0].done = true; // updates todos, then active
```

## Ownership

Derives, [effects](/api/effect) and [`.effect()`](/api/state#subscribing-to-changes) subscriptions created while `fn` runs, including in the components it renders, belong to the derive: they stop when it runs again. So a list item's effects stop when the list is rebuilt, with no cleanup code.

Because of this, don't keep an element or a derive created inside a derive and reuse it after the derive re-runs. Create derives you share across the app at module level, or in a component no derive renders.

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

Every change calls `fn` again, so the element is created fresh each time, and the effects of the old one stop.

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
