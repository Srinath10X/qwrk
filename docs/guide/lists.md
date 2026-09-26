# Lists

Call `.map()` on a state that holds an array to render one row per item:

```jsx
import { state } from "qwrk";

function Todos() {
  const todos = state([
    { text: "Write docs", done: false },
    { text: "Ship it", done: false },
  ]);

  function add() {
    todos.value.push({ text: "Celebrate", done: false });
  }

  return (
    <>
      <ul>
        {todos.map((todo) => (
          <li onClick={() => (todo.done = !todo.done)}>{todo.text}</li>
        ))}
      </ul>
      <button onClick={add}>Add</button>
    </>
  );
}
```

The function runs once for each new item, and the list keeps its rows in sync with the array:

- `push`, `unshift` and `splice` insert and remove only those rows.
- `sort`, `reverse` and swaps move the existing rows, with their DOM nodes, so inputs keep what the user typed.
- Assigning a new array works too: `todos.value = todos.value.filter((todo) => !todo.done)` removes the rows of the done items and keeps the others.
- `todos.value = []` clears the list at once.

## Keys

Rows are keyed by the items themselves: objects by identity, strings and numbers by value. There is no `key` prop.

A new object is a new item, even if it holds the same data, so its row is rebuilt:

```js
todos.value = todos.value.map((todo) => ({ ...todo })); // rebuilds every row
todos.value[0].done = true; // keeps the row, and notifies todos
```

The same item twice renders two rows.

## Items

The function receives each item as `todos.value[i]` returns it: objects and arrays as proxies, so changing them notifies `todos`, and nested states and primitives as they are. It gets no index, since the index changes when rows move.

To keep a value in a row up to date, store it in a state inside the item:

```jsx
const todos = state([{ text: state("Write docs") }]);

<ul>{todos.map((todo) => <li>{todo.text}</li>)}</ul>;

todos.value[0].text.value = "Write more docs"; // updates only that <li>
```

Reading an item's field inside a derive subscribes the derive to the whole array, like reading `todos.value`. Read fields that don't change once, in the function:

```jsx
todos.map((todo) => {
  const { id } = todo;
  return <li class={derive(() => (selected.value === id ? "active" : ""))}>{id}</li>;
});
```

## Cleanup

Each row owns the derives and effects its function created. Removing the row stops them, and its DOM is freed once nothing references it. A list created while a derive runs, such as in a component the derive renders, stops with all its rows when that derive runs again.

## Filtered and derived lists

`.map()` works on derives too, so a filtered view keeps the rows of the items that stay:

```jsx
const open = derive(() => todos.value.filter((todo) => !todo.done));

<ul>{open.map((todo) => <li>{todo.text}</li>)}</ul>;
```

A derive that returns the rows, `derive(() => todos.value.map(...))`, rebuilds every row on each change. It is fine for a handful of items.
