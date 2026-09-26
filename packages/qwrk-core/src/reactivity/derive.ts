import { computation, run, state, type State } from "#qwrk/reactivity/state.js";

/**
 * Creates a state whose value is `fn()`, recomputed whenever a state it
 * depends on changes. It never recomputes twice for one change, and never sees
 * some of its dependencies updated but not others. When the result is the
 * same as before, what depends on it doesn't update, unless it is an array or
 * a plain object, which may have changed in place.
 *
 * Dependencies are the states `fn` reads, detected on every run, or `deps`
 * when given. Derives and effects created while `fn` runs, such as in the
 * components it renders, stop when it runs again.
 *
 * @param fn - Computes the value.
 * @param deps - States that trigger a recompute, instead of detecting them.
 * @example
 * const count = state(1);
 * const doubled = derive(() => count.value * 2);
 */
export function derive<T>(fn: () => T, deps?: State<any>[]): State<T> {
  const derived = computation(state(undefined as T), fn, deps);
  run(derived);
  return derived;
}
