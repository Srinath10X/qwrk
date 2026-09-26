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

/** Receives the owner, the new and old value, and the data given to {@link watch}. */
type Listener = (owner: any, value: any, oldValue: any, data: any) => void;

/** A subscription. Weak ones reach their owner through a `WeakRef`. */
interface Entry {
  ref: WeakRef<object> | null;
  fn: Listener;
  data: unknown;
  entries: Set<Entry>;
}

const SUBSCRIBE = Symbol("subscribe");
const KEEP = Symbol("keep");
const REF = Symbol("ref");

/** States with `.effect()` subscribers, kept alive until they stop. */
const roots = new Set<State<any>>();

/** States read while {@link track} runs, or `null` outside of it. */
let reads: Set<State<any>> | null = null;

/** Removes a weak subscription once its owner is garbage collected. */
const cleanup = new FinalizationRegistry<Entry>((entry) =>
  entry.entries.delete(entry),
);

/** Keeps `target` alive for as long as `holder` is. */
export function retain(holder: object, target: object) {
  const kept = (holder as any)[KEEP];

  if (kept === undefined) (holder as any)[KEEP] = target;
  else if (Array.isArray(kept)) kept.includes(target) || kept.push(target);
  else if (kept !== target) (holder as any)[KEEP] = [kept, target];
}

/**
 * Subscribes to `source` for as long as `owner` is alive, and keeps `source`
 * alive for as long as `owner` is. `fn` receives the owner and `data`, so it
 * must not capture the owner, or the owner could never be collected.
 *
 * DOM bindings and derives use this, so a node removed from the page frees
 * its subscriptions without an unmount step.
 *
 * @returns A function that unsubscribes.
 */
export function watch<T, O extends object, D = undefined>(
  source: State<T>,
  owner: O,
  fn: (owner: O, value: T, oldValue: T, data: D) => void,
  data?: D,
): () => void {
  retain(owner, source);
  return (source as any)[SUBSCRIBE](owner, fn, data);
}

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
 * Runs `fn` without collecting the states it reads.
 */
export function untrack<T>(fn: () => T): T {
  const outer = reads;
  reads = null;

  try {
    return fn();
  } finally {
    reads = outer;
  }
}

function runEffect(_: unknown, value: unknown, old: unknown, fn: Effect<any>) {
  fn(value, old);
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
  let proxies: WeakMap<object, object> | undefined;
  let strong = 0;

  function changed() {
    notify(value);
  }

  function wrap(target: T) {
    if (typeof target !== "object" || target === null) return target;
    return deep(target, changed, (proxies ??= new WeakMap()));
  }

  function notify(old: T) {
    const next = wrap(value);
    const prev = wrap(old);
    const outer = reads;
    reads = null;

    try {
      for (const entry of [...entries]) {
        const owner = entry.ref ? entry.ref.deref() : null;
        if (entry.ref && !owner) entries.delete(entry);
        else entry.fn(owner, next, prev, entry.data);
      }
    } finally {
      reads = outer;
    }
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
      const entry: Entry = { ref: null, fn: runEffect, data: fn, entries };
      entries.add(entry);
      strong++;
      roots.add(self);

      return () => {
        if (!entries.delete(entry)) return;
        if (--strong === 0) roots.delete(self);
      };
    },
  };

  (self as any)[SUBSCRIBE] = (owner: object, fn: Listener, data: unknown) => {
    const ref = ((owner as any)[REF] ??= new WeakRef(owner));
    const entry: Entry = { ref, fn, data, entries };
    entries.add(entry);
    cleanup.register(owner, entry, entry);

    return () => {
      entries.delete(entry);
      cleanup.unregister(entry);
    };
  };

  return self;
}

/** Checks whether `object` was created by {@link state}. */
export function isReactive(object: unknown): object is State<unknown> {
  return (object as State<unknown> | null)?.__MagicVariable__ === true;
}
