import { isReactive, track } from "#/reactivity/state.js";

/**
 * Runs `callback` once after the component is mounted, then again whenever a
 * state it depends on is written.
 *
 * Dependencies are the states `callback` reads, detected on every run. Pass
 * `deps` to watch specific states instead, or `[]` to run only once.
 *
 * The first run waits for `DOMContentLoaded`, or for a microtask when the
 * document is already loaded, so it happens after `append(<App />)`.
 *
 * @param callback - Side effect to run.
 * @param deps - States that re-run the callback, instead of detecting them.
 */
export function effect(callback: () => void, deps?: unknown[]) {
  let running = false;

  function run() {
    // A callback that writes a state it reads would otherwise call itself forever.
    if (running) return;
    running = true;

    try {
      const { reads } = track(callback);
      (deps ?? [...reads]).forEach((dep) => {
        if (isReactive(dep)) dep.effect(run);
      });
    } finally {
      running = false;
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run, { once: true });
  } else {
    queueMicrotask(run);
  }
}
