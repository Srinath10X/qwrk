# state()

Creates a **reactive state**. Writing to its `.value` updates every place it's used in JSX and runs its effects.

```ts
function state<T>(initialValue: T): State<T>;
```

## Reading and writing

```jsx
import { state } from "qwrk";

const count = state(0);

count.value; // 0
count.value = 10; // updates the DOM bound to count
count.value++; // works too
```

Every write notifies, even when the new value equals the old one.

## Arrays and objects

Arrays and plain objects also notify when you change them in place, at any depth:

```js
const todos = state([{ text: "Write docs", done: false }]);

todos.value.push({ text: "Ship it", done: false });
todos.value[0].done = true;
todos.value.splice(1, 1);
todos.value = []; // assigning still works too
```

Each change notifies once, so `push()` updates the DOM once. Since the array is the same object before and after, `.effect()` receives the same value as `value` and `oldValue`.

To do this, `.value` returns a `Proxy` of the array or object. It behaves like the original, and `todos.value === todos.value` holds. Only arrays and plain objects are wrapped: changes inside a `Map`, `Set`, `Date` or class instance don't notify, so assign a new one.

## Using it in JSX

Pass the state itself to keep the DOM in sync. Reading `.value` in JSX takes a one-time snapshot.

```jsx
export default function App() {
  const count = state(0);

  return (
    <>
      <h1>Count: {count}</h1>
      <button onClick={() => count.value++}>Increment</button>
    </>
  );
}
```

States work as attributes too: `<button disabled={isSaving}>`. See [Components & JSX](/guide/components#attributes).

## Subscribing to changes

`.effect(fn)` runs `fn` after every write, with the new and previous values:

```js
const count = state(1);

count.effect((value, oldValue) => {
  console.log(`${oldValue} -> ${value}`);
});

count.value = 2; // logs "1 -> 2"
```

It returns a function that stops it:

```js
const stop = count.effect((value) => console.log(value));

stop();
count.value = 3; // logs nothing
```

To run code once after mount as well as on changes, use [`effect()`](/api/effect).

## TypeScript

`state` infers its type from the initial value, or you can set it explicitly. The `State<T>` type is exported:

```ts
import { state, type State } from "qwrk";

const name = state<string | null>(null);

function greet(user: State<string | null>) {
  return user.value ?? "stranger";
}
```
