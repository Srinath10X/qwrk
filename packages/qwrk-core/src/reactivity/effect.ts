import { isReactive } from "#/reactivity/state.js";

/**
 * Runs `callback` once after the component is mounted, then again whenever
 * one of the reactive `deps` changes.
 *
 * The first run waits for `DOMContentLoaded`, or for a microtask when the
 * document is already loaded, so it happens after `append(<App />)`.
 *
 * @param callback - Side effect to run.
 * @param deps - States that re-trigger the callback when written.
 */
export function effect(callback: () => void, deps: unknown[] = []) {
  deps.forEach((dep) => {
    if (isReactive(dep)) dep.effect(() => callback());
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => callback(), {
      once: true,
    });
  } else {
    queueMicrotask(callback);
  }
}
