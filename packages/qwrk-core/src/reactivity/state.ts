/** Called with the new and previous value after every write. */
export type Effect<T> = (value: T, oldValue: T) => void;

/** A reactive value created by {@link state}. */
export interface State<T> {
  __MagicVariable__: true;
  value: T;
  /** Runs `fn` after every write. Returns a function that stops it. */
  effect(fn: Effect<T>): () => void;
}

/** States read while {@link track} runs, or `null` outside of it. */
let reads: Set<State<any>> | null = null;

/**
 * Runs `fn` and collects every state whose `.value` it reads.
 */
export function track<T>(fn: () => T) {
  const outer = reads;
  const collected = (reads = new Set<State<any>>());

  try {
    return { value: fn(), reads: collected };
  } finally {
    reads = outer;
  }
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

  const self: State<T> = {
    __MagicVariable__: true,

    get value() {
      reads?.add(self);
      return value;
    },

    set value(next) {
      const old = value;
      value = next;
      effects.forEach((fn) => fn(next, old));
    },

    effect(fn) {
      effects.add(fn);
      return () => effects.delete(fn);
    },
  };

  return self;
}

/** Checks whether `object` was created by {@link state}. */
export function isReactive(object: unknown): object is State<unknown> {
  return (object as State<unknown> | null)?.__MagicVariable__ === true;
}
