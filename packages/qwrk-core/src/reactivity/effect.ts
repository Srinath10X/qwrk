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
 * An effect created while a derive runs, such as in a component rendered by
 * one, stops when that derive runs again. Any other effect lives until stopped.
 *
 * @param callback - Side effect to run.
 * @param deps - States that re-run the callback, instead of detecting them.
 * @returns A function that stops the effect.
 */
export function effect(callback: () => void, deps?: unknown[]): () => void {
  return watcher(callback, deps, true);
}
