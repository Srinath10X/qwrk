---
layout: home
title: Qwrk
titleTemplate: ":title · Reactive UI without re-renders"
markdownStyles: false
---

<Landing>
<template #code>

```jsx
import { state } from "qwrk";

export function App() {
  const count = state(0);
  const selected = state(1);
  const todos = state([
    { id: 1, text: "Write docs" },
    { id: 2, text: "Ship it" },
  ]);

  return (
    <main>
      <button onClick={() => count.value++}>
        clicked {count.value} times
      </button>
      <ul>
        {todos.map((todo) => (
          <li
            class={selected.value === todo.id ? "active" : ""}
            onClick={() => (selected.value = todo.id)}
          >
            {todo.text}
          </li>
        ))}
      </ul>
    </main>
  );
}
```

</template>
</Landing>
