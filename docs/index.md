---
layout: home
title: Qwrk
titleTemplate: ":title · Reactive UI without re-renders"
markdownStyles: false
pageClass: q-home
---

<Landing>
<template #code>

```jsx
import { state } from "qwrk";

function Counter() {
  const count = state(0);

  return (
    <button onClick={() => count.value++}>
      clicked {count} times
    </button>
  );
}

document.body.append(<Counter />);
```

</template>
</Landing>
