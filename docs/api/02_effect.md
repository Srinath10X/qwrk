# effect
The `effect` function is used to create side effects.
- Side effects are functions that run after the component is mounted and before it is unmounted.
```jsx
effect(() => {
  /** 
   * This runs once after the component is mounted:
   * after DOMContentLoaded, or on the next microtask
   * if the page has already loaded
   */
  console.log('side effect')
})
```

> [!NOTE]
> Effect takes two arguments `fn` and `deps` 
> - `fn` is the side effect function
> - `deps` is an array of dependencies (optional), `fn` runs again whenever one of them changes
