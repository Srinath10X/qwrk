# Components & JSX

## Components run once

A component is a plain function that returns DOM nodes. It runs **once**, when you call it. There is no re-render: reactivity comes from passing a [`state`](/api/state) into JSX, which keeps that exact text or attribute in sync.

```jsx
import { state } from "qwrk";

function Counter() {
  const count = state(0);

  return (
    <p>
      live: {count}, snapshot: {count.value}
    </p>
  );
}
```

After `count.value = 5`, the paragraph shows `live: 5, snapshot: 0`. Pass the state itself (`{count}`) to keep it live. `{count.value}` reads the value once.

## Props and children

Components receive their props as one object, with nested JSX in `children`:

```jsx
function Card({ title, children }) {
  return (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

<Card title="Hello">
  <p>Body text</p>
</Card>;
```

## Fragments

`<>...</>` groups elements without a wrapper. A fragment is a native `DocumentFragment`: appending it moves its children into the parent.

```jsx
function App() {
  return (
    <>
      <h1>Title</h1>
      <p>Text</p>
    </>
  );
}

document.getElementById("root").append(<App />);
```

## Events

Any `on*` prop whose value is a function becomes an event listener. The event name is lowercased, so `onClick` listens for `click` and `onDblClick` for `dblclick`.

```jsx
<button onClick={(event) => console.log(event)}>Click me</button>
```

## Attributes

| JSX | DOM |
| --- | --- |
| `className="a"` | `class="a"` |
| `htmlFor="id"` | `for="id"` |
| `disabled={true}` | `disabled=""` |
| `hidden={false}`, `null`, `undefined` | attribute removed |
| `data-id={7}` | `data-id="7"` |
| `style="color: red"` | `style="color: red"` |

`style` also takes an object with camelCase, kebab-case or custom property keys:

```jsx
<div style={{ backgroundColor: "red", "--gap": "4px" }} />
// style="background-color: red; --gap: 4px;"
```

Pass a state to keep an attribute in sync:

```jsx
const disabled = state(true);

<button disabled={disabled}>Save</button>;

disabled.value = false; // removes the disabled attribute
```

### Form inputs

`value`, `checked` and `selected` are set as properties, so they keep working after the user edits the field:

```jsx
const text = state("");

<input value={text} onInput={(e) => (text.value = e.currentTarget.value)} />;

text.value = ""; // clears the input, even after typing
```

`<select value={choice}>` selects the matching `<option>`.

### SVG

SVG tags such as `<svg>`, `<path>` and `<circle>` are created as SVG elements, so inline icons work:

```jsx
<svg viewBox="0 0 24 24" width="24" height="24">
  <circle cx="12" cy="12" r="10" fill="currentColor" />
</svg>

## Children

- Strings and numbers render as text, including `0`.
- `false`, `true`, `null` and `undefined` render nothing.
- Arrays are flattened, so `items.map(...)` works.
- A state renders its value and updates in place. It can hold text, a number, an element, a fragment or an array of them:

```jsx
const view = state(<p>Loading...</p>);

<div>{view}</div>;

view.value = <strong>Done</strong>; // swaps the element
view.value = [<p>One</p>, <p>Two</p>]; // swaps in both
view.value = null; // clears it
```

For lists and conditions that follow a state, use [`derive()`](/api/derive#lists).

## Limitations

Qwrk keeps its core small, so some things are deliberately not there yet:

- **Plain expressions are evaluated once.** `{show.value && <p />}` and `{items.map(...)}` don't update when the state changes. Wrap them in [`derive()`](/api/derive).
- **Lists re-render fully.** A derived list rebuilds every item on each change. That's fine for dozens of items, not thousands.
- **No unmount.** Removing elements from the page doesn't stop their effects. `.effect()` returns a function to stop one by hand.
