# effect
The `effect` function is used to create side effects.
- Side effects are functions that run after the component is mounted and before it is unmounted.
```jsx
effect(() => {
  /** 
   * This will run only once the component is mounted
   * to be very specific it will only run after 
   * DOMContentLoaded  event is triggered 
   */
  console.log('side effect')
})
```

> [!NOTE]
> Effect takes two arguments `fn` and `deps` 
> - `fn` is the side effect function
> - `deps` is an array of dependencies (optional)
