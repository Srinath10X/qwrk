# state()
---

Creates a **reactive state object** that triggers effects when changed.

- The state object takes **initial value** as an argument.
which has a reference to the state object.

```jsx
/**
 * Create a state object with initial value 0
 * state(initialValue) -> ReactiveState
 */
const count = state(0);
```

- We can access and set the value of the state object using the `.value` property.

```jsx
/**
 * Create a state object with initial value 0
 */
const count = state(0);
/**
 * Get the current value of the state object
 * count.value -> number
 */
const value = count.value;

/**
 * Set the value of the state object
 * count.value = newValue -> void
 */
count.value = 10;
```

### Usage
```jsx
import { state } from "qwrk";

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

> [!NOTE]
> Elements which has access to the state object have `__magicVariable__` property
