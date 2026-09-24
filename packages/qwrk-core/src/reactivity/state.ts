/** Called with the new and previous value after every write. */
export type Effect<T> = (value: T, oldValue: T) => void;

/** A reactive value created by {@link state}. */
export interface State<T> {
  __MagicVariable__: true;
  value: T;
  effect(fn: Effect<T>): void;
}

/**
 * Creates a reactive state object. Writing to `.value` runs every registered
 * effect, which updates any DOM bound to it.
 *
 * @param value - Initial value.
 * @example
 * const count = state(0);
 * count.value++;
 */
export function state<T>(value: T): State<T> {
  const effects = new Set<Effect<T>>();

  return {
    __MagicVariable__: true,

    get value() {
      return value;
    },

    set value(next) {
      const old = value;
      value = next;
      effects.forEach((fn) => fn(next, old));
    },

    effect(fn) {
      effects.add(fn);
    },
  };
}

/** Checks whether `object` was created by {@link state}. */
export function isReactive(object: unknown): object is State<unknown> {
  return (object as State<unknown> | null)?.__MagicVariable__ === true;
}
