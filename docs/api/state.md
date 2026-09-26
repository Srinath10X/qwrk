# state()

Creates a **reactive state**. Writing a new value to its `.value` updates every place it's used in JSX and runs its effects.

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

Writing the value a state already holds, compared with `Object.is`, does nothing. That includes `todos.value[0].done = true` when it already is, and `todos.value = todos.value`. To signal a change made inside a `Map`, `Set` or class instance, assign a new one.

Each write updates the DOM and runs effects before the next line runs. To update once after several writes, group them with [`batch()`](/api/batch).

## Arrays and objects

Arrays and plain objects also notify when you change them in place, at any depth:

```js
const todos = state([{ text: "Write docs", done: false }]);

todos.value.push({ text: "Ship it", done: false });
todos.value[0].done = true;
todos.value.splice(1, 1);
todos.value = []; // assigning still works too
```

Each mutator call (`push`, `sort`...) notifies once, so `push()` updates the DOM once. Writing the value a key already has, or deleting a key that isn't there, doesn't notify. Since the array is the same object before and after, `.effect()` receives the same value as `value` and `oldValue`.

To do this, `.value` returns a `Proxy` of the array or object. It behaves like the original, and `todos.value === todos.value` holds. Only arrays and plain objects are wrapped: changes inside a `Map`, `Set`, `Date` or class instance don't notify, so assign a new one.

Items you read are proxies too, so they aren't `===` to the object you stored:

```js
const item = { text: "Write docs", done: false };
todos.value = [item];

todos.value[0] === item; // false: a proxy of item
todos.value.includes(item); // true
todos.value.indexOf(item); // 0
```

`includes`, `indexOf` and `lastIndexOf` find either one, and the same object always gives the same proxy. In `find` and `filter`, compare by id: `todos.value.find((todo) => todo.id === id)`.

A state stored inside an array or object stays a state and isn't wrapped. Writing it updates only its own bindings, not everything bound to the outer state:

```js
const rows = state([{ label: state("a") }]);

rows.value[0].label.value = "b"; // updates the label, not the whole list
```

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

`.effect(fn)` runs `fn` after every change, after the DOM is updated, with the new and previous values:

```js
const count = state(1);

count.effect((value, oldValue) => {
  console.log(`${oldValue} -> ${value}`);
});

count.value = 2; // logs "1 -> 2"
```

It returns a function that stops it. Until then, the effect keeps the state alive:

```js
const stop = count.effect((value) => console.log(value));

stop();
count.value = 3; // logs nothing
```

Inside a [`batch()`](/api/batch) it runs once, with the value from before the batch as `oldValue`. A `.effect()` created while a [derive](/api/derive#ownership) or an [effect](/api/effect#stopping) runs stops when that one runs again. Derives created in `fn` keep updating after `fn` runs again.

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
