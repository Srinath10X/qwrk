# batch()

Runs `fn` and updates everything that depends on the states it wrote once, when it returns.

```ts
function batch<T>(fn: () => T): T;
```

## Usage

```jsx
import { state, derive, batch } from "qwrk";

const first = state("a");
const last = state("b");
const full = derive(() => `${first.value} ${last.value}`);

<p>{full}</p>;

full.effect((value, oldValue) => console.log(value, oldValue));

batch(() => {
  first.value = "Ada";
  last.value = "Lovelace";
});
// full recomputes and the <p> updates once
// logs "Ada Lovelace" "a b" once
```

## Every write is already a batch

Without `batch`, each write updates the DOM and runs effects before the next line runs. Use `batch` when several writes belong together, so derives, the DOM and effects update once instead of after each write.

## Nesting

Batches can be nested. Inner batches don't update anything themselves: everything updates once, when the outermost one ends.

## Reading inside a batch

Derives read inside the batch are already up to date:

```js
const count = state(1);
const doubled = derive(() => count.value * 2);

batch(() => {
  count.value = 5;
  doubled.value; // 10
});
```

## Return value

`batch` returns what `fn` returns:

```js
const id = batch(() => {
  todos.value.push({ id: 3, text: "Ship it" });
  selected.value = 3;
  return 3;
});
```

## Errors

If `fn` throws, the writes it made before the error still apply, what depends on them updates, and the error is rethrown. An error thrown by a subscriber while updating is rethrown in its place.

## Only the synchronous part

`batch` groups the writes made while `fn` runs. Writes after an `await` inside `fn` happen later, outside the batch, so they update one by one:

```js
batch(async () => {
  loading.value = true; // batched
  const data = await load();
  items.value = data; // not batched: it updates right away
});
```
