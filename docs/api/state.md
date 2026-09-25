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
