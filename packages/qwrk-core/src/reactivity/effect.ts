import { watcher } from "#qwrk/reactivity/state.js";

/**
 * Runs `callback` once after the component is mounted, then again whenever a
 * state it depends on changes, after the DOM is updated.
 *
 * Dependencies are the states `callback` reads, detected on every run. Pass
 * `deps` to watch specific states instead, or `[]` to run only once.
 *
 * The first run waits for `DOMContentLoaded`, or for a microtask when the
 * document is already loaded, so it happens after `append(<App />)`.
 *
 * An effect created while a derive or another effect runs, such as in a
 * component either one renders, stops when that one runs again. Any other
 * effect lives until stopped. Derives created while `callback` runs don't
 * stop with it: they live as long as their DOM.
 *
 * @param callback - Side effect to run.
 * @param deps - States that re-run the callback, instead of detecting them.
 * @returns A function that stops the effect.
 */
export function effect(callback: () => void, deps?: unknown[]): () => void {
  return watcher(callback, deps, true);
}
