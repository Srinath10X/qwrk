/**
 * @name: state
 * @description Creates a reactive state object that tracks changes and triggers effects.
 *
 * @template T
 * @param {T} initialValue - The initial value of the state.
 * @returns {{
 *   __MagicVariable__: true,
 *   value: T,
 *   effect: (fn: (newValue: T, oldValue: T) => void) => void,
 *   react: () => void
 * }}
 */
export function state(initialValue) {
  const effects = new Set();
  const currentValue = initialValue;

  return {
    __MagicVariable__: true,

    get value() {
      return initialValue;
    },

    set value(newValue) {
      initialValue = newValue;
      this.react();
    },

    effect(fn) {
      effects.add(fn);
    },

    react() {
      effects.forEach((fn) => fn(initialValue, currentValue));
    },
  };
}
