import { deep, toRaw } from "#/reactivity/deep.js";

/** Called with the new and previous value after every write. */
export type Effect<T> = (value: T, oldValue: T) => void;

/** A reactive value created by {@link state}. */
export interface State<T> {
  __MagicVariable__: true;
  value: T;
  /** Runs `fn` after every write. Returns a function that stops it. */
  effect(fn: Effect<T>): () => void;
}

/** Receives the subscriber's owner, if it has one, and the new and old value. */
type Listener = (owner: any, value: any, oldValue: any) => void;

/** A subscription. Weak ones hold their owner through a `WeakRef`. */
interface Entry {
  owner?: WeakRef<object>;
  fn: Listener;
}

/** Weak subscribe of each state, used by {@link watch}. */
const subscribers = new WeakMap<
  State<any>,
  (owner: object, fn: Listener) => () => void
>();

/** States with `.effect()` subscribers, kept alive until they stop. */
const roots = new Set<State<any>>();

/** Objects each holder keeps alive, see {@link retain}. */
const retained = new WeakMap<object, Set<unknown>>();

/** Removes weak subscriptions once their owner is garbage collected. */
const cleanup = new FinalizationRegistry<() => void>((remove) => remove());

/** Keeps `target` alive for as long as `holder` is. */
export function retain(holder: object, target: unknown) {
  let targets = retained.get(holder);
  if (!targets) retained.set(holder, (targets = new Set()));
  targets.add(target);
}

/**
 * Subscribes to `source` for as long as `owner` is alive, and keeps `source`
 * alive for as long as `owner` is. `fn` receives the owner, so it must not
 * capture it, or the owner could never be collected.
 *
 * DOM bindings and derives use this, so a node removed from the page frees
 * its subscriptions without an unmount step.
 *
 * @returns A function that unsubscribes.
 */
export function watch<T, O extends object>(
  source: State<T>,
  owner: O,
  fn: (owner: O, value: T, oldValue: T) => void,
) {
  retain(owner, source);
  return subscribers.get(source)!(owner, fn);
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
 * effect, which updates any DOM bound to it. Arrays and plain objects notify
 * when changed in place too: `list.value.push(x)`, `user.value.name = x`.
 *
 * @param value - Initial value.
 * @example
 * const count = state(0);
 * count.value++;
 */
export function state<T>(value: T): State<T> {
  const entries = new Set<Entry>();
  const proxies = new WeakMap<object, object>();
  let strong = 0;

  function wrap(target: T) {
    return deep(target, () => notify(value), proxies);
  }

  function notify(old: T) {
    track(() => {
      for (const entry of [...entries]) {
        const owner = entry.owner?.deref();
        if (entry.owner && !owner) entries.delete(entry);
        else entry.fn(owner, wrap(value), wrap(old));
      }
    });
  }

  function subscribe(owner: object, fn: Listener) {
    const entry: Entry = { owner: new WeakRef(owner), fn };
    entries.add(entry);
    cleanup.register(owner, () => entries.delete(entry), entry);

    return () => {
      entries.delete(entry);
      cleanup.unregister(entry);
    };
  }

  const self: State<T> = {
    __MagicVariable__: true,

    get value() {
      reads?.add(self);
      return wrap(value);
    },

    set value(next) {
      const old = value;
      value = toRaw(next);
      notify(old);
    },

    effect(fn) {
      const entry: Entry = { fn: (_, value, old) => fn(value, old) };
      entries.add(entry);
      strong++;
      roots.add(self);

      return () => {
        if (!entries.delete(entry)) return;
        if (--strong === 0) roots.delete(self);
      };
    },
  };

  subscribers.set(self, subscribe);
  return self;
}

/** Checks whether `object` was created by {@link state}. */
export function isReactive(object: unknown): object is State<unknown> {
  return (object as State<unknown> | null)?.__MagicVariable__ === true;
}
