import { state, track, type State } from "#/reactivity/state.js";

/**
 * Creates a state whose value is `fn()`, recomputed whenever a state it
 * depends on is written.
 *
 * Dependencies are the states `fn` reads, detected on every run, or `deps`
 * when given.
 *
 * @param fn - Computes the value.
 * @param deps - States that trigger a recompute, instead of detecting them.
 * @example
 * const count = state(1);
 * const doubled = derive(() => count.value * 2);
 */
export function derive<T>(fn: () => T, deps?: State<any>[]): State<T> {
  const derived = state(undefined as T);
  let stops: (() => void)[] = [];
  let running = false;

  function update() {
    if (running) return;
    running = true;

    try {
      const { value, reads } = track(fn);
      stops.forEach((stop) => stop());
      stops = (deps ?? [...reads]).map((dep) => dep.effect(update));
      derived.value = value;
    } finally {
      running = false;
    }
  }

  update();
  return derived;
}
