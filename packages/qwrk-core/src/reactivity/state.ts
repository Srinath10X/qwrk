import { deep, isPlain, toRaw } from "#qwrk/reactivity/deep.js";

/** Called with the new and previous value after every change. */
export type Effect<T> = (value: T, oldValue: T) => void;

/**
 * A reactive value created by {@link state} or {@link derive}.
 *
 * `map` is added by the module that renders JSX at runtime, and compiled JSX
 * imports it as a function, so an app that renders no list doesn't ship it.
 */
export interface State<T> {
  value: T;
  /** Runs `fn` after every change. Returns a function that stops it. */
  effect(fn: Effect<T>): () => void;
  /**
   * Whether the value is `key`, compared unwrapped with `Object.is`. In a
   * derive, an effect or a compiled JSX expression, it re-runs only when the
   * answer changes: a write re-runs the readers of the old and the new value
   * only. The compiler turns `a.value === b` in JSX into it.
   */
  is(key: unknown): boolean;
  /**
   * Renders one row per item of the array, keyed by the item itself: `fn`
   * runs once per new item, and a change only adds, removes and moves the
   * rows that changed. Removing a row stops the derives and effects it
   * created.
   */
  map<I>(
    this: State<readonly I[] | null | undefined>,
    fn: (item: I) => unknown,
  ): DocumentFragment;
}

/** Updates a DOM binding's owner with the data given to {@link watch} and the new value. */
type Listener = (owner: any, data: any, value: any) => void;

/**
 * A listener subscribed with {@link watch}. It reaches its owner through a
 * `WeakRef`, so the owner can be garbage collected, which drops it even from
 * a state that is never written again. Computations subscribe directly
 * instead, and stop when disposed.
 */
interface Entry {
  r: WeakRef<object>;
  /** The listeners of the source it belongs to. */
  o: Entry[];
  /** Its position in them. */
  i: number;
  /** Updates the owner. */
  f: Listener;
  /** Passed to `f`. */
  d: unknown;
}

/**
 * A derive, an effect or a DOM binding. Its fields live on the derive's state,
 * or on a plain object for the others.
 */
export interface Computation {
  /** Runs it. A derive's value is the result. */
  f: () => unknown;
  /**
   * The states it depends on, each followed by the version it saw and its
   * slot in their subscribers, so dropping one is a swap with the last. A
   * running one reorders them as it reads them, and one it didn't subscribe
   * to yet has the slot -1.
   */
  s: any[];
  /** Explicit dependencies, instead of tracking reads. */
  d?: Signal<any>[];
  /** The first of what its last run created, linked through `n`. */
  c?: Computation;
  /** The next sibling its owner created, if any. */
  n?: Computation;
  /** The computation whose run created it. */
  p: Computation | null;
  /** 0 up to date, 1 stale, 2 running, 3 disposed. */
  q: number;
  /** Derives only: their subscribers, value and version. */
  o?: Computation[];
  _?: unknown;
  v?: number;
  /** Effects only: they run after the DOM bindings, and own only effects. */
  e?: 1;
}

const KEEP = Symbol();

/** The empty list of whatever has none yet. Never written to. */
export const NONE: any[] = [];

/**
 * The dependencies of the derive or effect running now, see
 * {@link Computation.s}, while it tracks what it reads, or `null`. Read by
 * the deep proxy too.
 */
export let reads: any[] | null = null;

/** How many of the running computation's dependencies it read so far. */
let at = 0;

/**
 * The dependencies of the derive or effect running now, even inside
 * {@link untrack}: its own writes update their versions, so they don't make
 * it stale.
 */
let seen: any[] | null = null;

/** The derive or effect running now: it owns what it creates. */
let owner: Computation | null = null;

/** Above 0 inside {@link batch}, a run or a flush: changes wait for the flush. */
let depth = 0;

/**
 * Stale derives, DOM bindings (with their source, or stale ones), and stale
 * effects, run in that order.
 */
const queue: Map<any, any>[] = [new Map(), new Map(), new Map()];

/** Effects created outside of a derive or an effect, alive until stopped. */
const roots = new Set<Computation>();

/** The first error a job threw in the running flush. */
let error: [unknown] | undefined;

/**
 * Drops the listeners of garbage collected owners, even from a state that
 * is never written again.
 */
const registry = new FinalizationRegistry<Entry>(unwatch);

class Signal<T> {
  /** The raw value. */
  declare _: T;
  /** One proxy per wrapped object. */
  declare m?: WeakMap<object, object>;
  /** The traps shared by its proxies. */
  declare h?: ProxyHandler<any>;
  /** Bumped on every change. */
  v = 0;
  /** Subscribed derives, effects and DOM bindings. */
  o: Computation[] = NONE;
  /** Subscribed listeners, see {@link watch}. */
  w: Entry[] = NONE;
  /** The subscriptions of each key read with {@link is}. */
  declare k?: Map<unknown, Key>;
  /** Added by the module that renders JSX at runtime, see {@link State}. */
  declare map: State<T>["map"];

  constructor(value: T) {
    this._ = toRaw(value);
  }

  get value(): T {
    refresh(this as any);
    track(this);
    return (this as any).f ? this._ : deep(this._, this);
  }

  set value(next: T) {
    const old = this._;
    next = toRaw(next);
    if (!Object.is(old, next)) {
      this._ = next;
      this.k && select(this, old);
      touch(this);
    }
  }

  effect(fn: Effect<T>) {
    let old: T;
    let ran = false;
    return watcher(() => {
      try {
        ran ? fn(this.value, old) : (ran = true);
      } finally {
        old = this.value;
      }
    }, [this]);
  }

  is(key: unknown) {
    return is(this, key);
  }
}

/** Records that `source` changed and notifies its subscribers. */
export function touch(source: Signal<any>) {
  mark(source);
  depth || flush();
}

/** Bumps the version of a state or a key, and notifies its subscribers. */
export function mark(source: Signal<any>) {
  source.v++;

  const i = seen?.indexOf(source) ?? -1;
  if (i >= 0) seen![i + 1] = source.v;

  notify(source);
}

/** Notifies the readers of the old and the new key of a changed state. */
function select(source: Signal<any>, old: unknown) {
  const keys = source.k!;
  const before = keys.get(old);
  const after = keys.get(source._);
  if (before) mark(before as any);
  if (after && after !== before) mark(after as any);
}

/**
 * Tracks `source` as a dependency of the running derive or effect, in place:
 * its entry moves up to follow those read before it in this run, which
 * allocates only when the order changed, or a new one, subscribed when the
 * run ends, joins there. Entries alternate states and numbers, so a search
 * for a state only ever finds a state.
 */
export function track(source: Signal<any>) {
  const list = reads;

  if (list) {
    let i = list.indexOf(source);
    if (i < 0) i = list.push(source, 0, -1) - 3;
    else if (i < at) return;

    if (i > at) list.splice(at, 0, ...list.splice(i, 3));
    list[at + 1] = source.v;
    at += 3;
  }
}

/** Returns the raw value of `source`, up to date, without tracking it. */
export function peek<T>(source: State<T>): T {
  refresh(source as any);
  return toRaw((source as Signal<T>)._);
}

/**
 * Marks `source`'s computations stale, and queues its listeners, with
 * everything that depends on them. With `deep`, listeners are skipped: a
 * stale derive queues its own once its value actually changes.
 */
function notify(source: Signal<any>, deep?: boolean) {
  const subs = source.o;

  for (let i = 0; i < subs.length; i++) {
    const sub = subs[i];
    if (!sub.q) stale(sub);
  }

  if (!deep) {
    const entries = source.w;

    for (let i = 0; i < entries.length;) {
      const entry = entries[i];

      if (entry.r.deref()) {
        queue[1].set(entry, source);
        i++;
      } else {
        unwatch(entry);
      }
    }
  }
}

/** Marks a computation stale and queues it, with what depends on it. */
function stale(node: Computation) {
  node.q = 1;
  if (node.o) {
    queue[0].set(node, 0);
    notify(node as any, true);
  } else {
    queue[node.e ? 2 : 1].set(node, 0);
  }
}

/**
 * Runs everything queued, then rethrows the first error a job threw.
 */
function flush() {
  depth++;

  try {
    drain(2);
    if (error) throw error[0];
  } finally {
    depth--;
    error = undefined;
  }
}

/**
 * Runs the queues up to `last`: stale derives, then DOM bindings, then effects,
 * so each sees settled values. After any of them ran, it starts over from the
 * derives. Before each effect, it settles the derives and DOM that the effects
 * before it changed. An error doesn't stop the rest.
 */
function drain(last: number) {
  let target: object | undefined;
  let passes = 0;

  for (let i = 0; i <= last; i++) {
    const jobs = queue[i];

    if (jobs.size) {
      if (++passes > 1e3) throw Error("qwrk: update loop");
      queue[i] = new Map();

      for (const job of jobs.keys()) {
        if (i > 1 && queue[0].size + queue[1].size) {
          try {
            drain(1);
          } catch (e) {
            error ??= [e];
          }
        }

        try {
          if (!job.r) refresh(job);
          else if ((target = job.r.deref())) {
            job.f(target, job.d, peek(jobs.get(job)));
          }
        } catch (e) {
          error ??= [e];
        }
      }

      i = -1;
    }
  }
}

/**
 * Brings a stale derive or effect up to date: its owner first, since re-running
 * the owner disposes it, then its sources, re-running it if one changed. A
 * source derive can write a source checked before it, so the versions are
 * compared once more at the end. While it checks, it counts as running, so a
 * derive that reads itself doesn't loop.
 */
function refresh(node: Computation) {
  if (node.q == 1) {
    for (let up = node.p; up; up = up.p) {
      if (up.q == 1) {
        refresh(up);
        break;
      }
    }

    if (node.q == 1) {
      node.q = 2;

      try {
        const { s } = node;
        for (let i = 0; i < s.length; i += 3) {
          refresh(s[i]);
          if (s[i + 1] !== s[i].v) return run(node);
        }
        for (let i = 0; i < s.length; i += 3) {
          if (s[i + 1] !== s[i].v) return run(node);
        }
      } finally {
        if (node.q == 2) node.q = 0;
      }
    }
  }
}

/**
 * Runs a derive or an effect: disposes what its last run created, tracks what
 * it reads in its own dependencies, then subscribes to the new ones and drops
 * those it didn't read, so a run that reads the same states allocates
 * nothing. A first run keeps an array of the exact size. Changes it makes
 * wait until it's done, and don't re-run it. A state another derive wrote
 * after this one read it makes it stale again.
 *
 * An unowned effect left with no dependencies never runs again, so it hands
 * the effects it created over to the roots, and stops being one.
 */
export function run(node: Computation) {
  if (node.q == 3) return;
  const old = node._;
  const fresh = node.s === NONE;
  const list = fresh ? (node.s = []) : node.s;
  const outerReads = reads;
  const outerSeen = seen;
  const outerOwner = owner;
  const outerAt = at;

  depth++;

  try {
    release(node);
    node.q = 2;
    reads = node.d ? null : list;
    seen = list;
    at = 0;
    owner = node;
    const value = node.f();
    if (node.o && (!Object.is(old, value) || isPlain(value))) {
      node._ = value;
      (node as any).k && select(node as any, old);
      touch(node as any);
    }
  } finally {
    reads = list;
    node.d?.forEach(track);
    const n = at;
    reads = outerReads;
    seen = outerSeen;
    owner = outerOwner;
    at = outerAt;

    if (node.q == 2) {
      node.q = 0;

      for (let i = 0; i < n; i += 3) {
        if (list[i + 2] < 0) list[i + 2] = link(list[i], node);
        if (list[i + 1] !== list[i].v && !node.q) stale(node);
      }
      for (let i = n; i < list.length; i += 3) {
        unlinkSource(list[i], node, list[i + 2]);
      }
      if (fresh || n < list.length) node.s = list.slice(0, n);

      if (!n && node.e && !node.p) {
        release(node, null);
        roots.delete(node);
      }
    }

    --depth || flush();
  }
}

/**
 * Empties what `node` created: disposes each one, or, given a `parent`, hands
 * it over to that parent, since `node` will never re-run. Without a parent,
 * an effect becomes a root, alive until stopped, and the rest live as long
 * as their DOM.
 */
function release(node: Computation, parent?: Computation | null) {
  let created = node.c;
  node.c = undefined;
  while (created) {
    const next = created.n;
    created.n = undefined;
    if (parent === undefined) {
      dispose(created);
    } else if (created.q != 3) {
      created.p = parent;
      if (parent) attach(parent, created);
      else if (created.e) roots.add(created);
    }
    created = next;
  }
}

/**
 * Stops a derive or an effect, and what its last run created: it drops its
 * subscriptions and never runs again.
 */
export function dispose(node: Computation) {
  if (node.q != 3) {
    node.q = 3;
    node.p = null;
    release(node);

    for (let i = 0; i < node.s.length; i += 3) {
      unlinkSource(node.s[i], node, node.s[i + 2]);
    }
    node.s = NONE;
    if (node.e) roots.delete(node);
  }
}

/**
 * Makes `node` a derive, an effect or a list, owned by the running
 * computation or list row, if any: an effect owns only effects, the others
 * own everything. A disposed one owns nothing, since it will never stop what
 * it created.
 */
export function computation<T extends object>(
  node: T,
  fn: () => unknown,
  deps?: unknown[],
): T & Computation {
  const parent = owner?.q != 3 && (!owner?.e || (node as any).e) ? owner : null;
  const created = Object.assign(node, {
    f: fn,
    s: NONE,
    d: deps?.filter(isReactive) as Signal<any>[] | undefined,
    p: parent,
    q: 0,
  });
  if (parent) attach(parent, created);
  return created;
}

/**
 * Runs `node`, a DOM binding, now, and again whenever a state it read
 * changes, subscribing it to what it read. A binding is a computation whose
 * `f` updates the DOM, and that runs before the effects: one object literal
 * with all of its fields, see {@link Key}, whose `f` reads the others, so it
 * needs no closure. Their names must not be ones the scheduler reads on
 * computations and listeners (`c d e n o p q r s v _`) for anything else: an
 * `e` would make it an effect, an `r` a listener.
 *
 * The running derive, binding or list row owns it, like a derive, and when
 * there is none, `holder` keeps it alive. One that read no state will never
 * run again, so it hands what it created over to its owner.
 */
export function bind(node: Computation, holder?: object) {
  const parent = (node.p = owner?.q != 3 && !owner?.e ? owner : null);
  run(node);

  if (!node.s.length) {
    node.q = 3;
    release(node, parent);
  } else if (parent) {
    attach(parent, node);
  } else if (holder) {
    retain(holder, node);
  }
}

/**
 * Creates an effect and hands it to `start`, which runs it now by default.
 * Unless a derive or an effect owns it, it lives until stopped.
 *
 * @returns A function that stops it.
 */
export function watcher(
  fn: () => void,
  deps?: unknown[],
  start: (node: Computation) => void = run,
) {
  const node = computation({ e: 1 }, fn, deps);
  node.p || roots.add(node);
  start(node);
  return () => dispose(node);
}

/**
 * Adds `node` to what `parent` created, newest first, without allocating:
 * disposal order never matters, since every child is disposed either way.
 */
function attach(parent: Computation, node: Computation) {
  node.n = parent.c;
  parent.c = node;
}

/**
 * Subscribes `owner` to `source`, until it is unlinked by disposal or by a
 * re-run that drops it. A key that left its map goes back in.
 *
 * @returns The owner's slot in the source's subscribers.
 */
function link(source: Signal<any> | Key, owner: Computation): number {
  const subs = source.o;

  if (subs === NONE) {
    source.o = [owner];
  } else {
    subs.push(owner);
  }
  if (!(source instanceof Signal)) source.m.set(source.k, source);
  return source.o.length - 1;
}

/**
 * Drops the subscription of `owner` to `source`, moving the last subscriber
 * into its slot. A key left without any leaves its map.
 */
function unlinkSource(
  source: Signal<any> | Key,
  owner: Computation,
  slot: number,
) {
  const subs = source.o;

  if (subs[slot] === owner) {
    const last = subs.pop()!;
    if (last !== owner) {
      subs[slot] = last;
      const i = last.s.indexOf(source);
      if (i >= 0) last.s[i + 2] = slot;
    }
    if (!subs.length && !(source instanceof Signal)) source.m.delete(source.k);
  }
}

/**
 * Drops a listener, moving the last one into its place. Only a listener
 * whose owner was collected is dropped, so the registry calls it at most
 * once more, when it no longer holds its place.
 */
function unwatch(entry: Entry) {
  const entries = entry.o;
  const i = entry.i;

  if (entries[i] === entry) {
    const last = entries.pop()!;
    if (last !== entry) (entries[i] = last).i = i;
  }
}

/** Keeps `target` alive for as long as `holder` is. */
export function retain(holder: object, target: object) {
  const kept = (holder as any)[KEEP];

  if (kept === undefined) (holder as any)[KEEP] = target;
  else if (Array.isArray(kept)) kept.includes(target) || kept.push(target);
  else if (kept !== target) (holder as any)[KEEP] = [kept, target];
}

/**
 * Subscribes `owner` to `source` for as long as `owner` is alive, and keeps
 * `source` alive for as long as `owner` is. `fn` receives the owner, `data`
 * and the raw new value, so it must not capture the owner, or the owner could
 * never be collected.
 *
 * DOM bindings use this, so a node removed from the page frees its
 * subscriptions without an unmount step.
 */
export function watch<T, O extends object, D = undefined>(
  source: State<T>,
  owner: O,
  fn: (owner: O, data: D, value: T) => void,
  data?: D,
) {
  const signal = source as unknown as Signal<T>;
  const subs = signal.w;
  const entry: Entry = {
    r: new WeakRef(owner),
    o: subs === NONE ? (signal.w = []) : subs,
    i: 0,
    f: fn,
    d: data,
  };
  entry.i = entry.o.push(entry) - 1;
  retain(owner, source);
  registry.register(owner, entry);
}

/**
 * Calls `fn(arg)` without collecting the states it reads.
 */
export function untrack<A, T>(fn: (arg: A) => T, arg?: A): T {
  return own(owner, fn as (arg?: A) => T, arg);
}

/**
 * Whether the value of `source` is `key`, subscribing the running
 * computation to that key only, see {@link State.is}.
 */
export function is(source: State<unknown>, key: unknown): boolean {
  const value = peek(source);
  key = toRaw(key);
  if (reads) trackKey(((source as Signal<unknown>).k ??= new Map()), key);
  return Object.is(value, key);
}

/**
 * Tracks the key `keys` holds for `key`, created on first use, as a
 * dependency of the running computation, which the caller checked there is.
 */
export function trackKey(
  keys: Map<unknown, Key> | WeakMap<object, Key>,
  key: any,
) {
  let found = keys.get(key);
  if (!found) {
    keys.set(key, (found = { v: 0, o: NONE, w: NONE, k: key, m: keys }));
  }
  track(found as any);
}

/**
 * A key of a map, with subscriptions of its own: a source that leaves the map
 * once it has none.
 *
 * Like everything created per list row, it is an object literal with all of
 * its fields: V8 keeps a literal's shape for as long as the code creating it,
 * but drops the shapes a class instance reaches through its fields once no
 * instance is left, as after clearing a list, and with them the optimized
 * code that relied on them.
 */
export interface Key {
  v: number;
  o: Computation[];
  w: Entry[];
  k: any;
  m: Map<unknown, Key> | WeakMap<object, Key>;
}

/**
 * Calls `fn(arg)` without collecting the states it reads, with `scope` owning
 * the derives and effects it creates.
 */
export function own<A, T>(
  scope: Computation | null,
  fn: (arg?: A) => T,
  arg?: A,
): T {
  const outerReads = reads;
  const outerOwner = owner;
  reads = null;
  owner = scope;

  try {
    return fn(arg);
  } finally {
    reads = outerReads;
    owner = outerOwner;
  }
}

/**
 * Runs `fn`, then updates what depends on the states it changed, once, when
 * the outermost batch ends, even if `fn` throws. Derives read inside `fn` are
 * already up to date.
 *
 * @param fn - Makes the changes.
 * @returns What `fn` returns.
 * @example
 * batch(() => {
 *   first.value = "Ada";
 *   last.value = "Lovelace";
 * });
 */
export function batch<T>(fn: () => T): T {
  depth++;

  try {
    return fn();
  } finally {
    --depth || flush();
  }
}

/**
 * Creates a reactive state object. Writing a new value to `.value` updates
 * the DOM bound to it and runs its effects; writing the value it already
 * holds does nothing. Arrays and plain objects notify when changed in place
 * too: `list.value.push(x)`, `user.value.name = x`.
 *
 * @param value - Initial value.
 * @example
 * const count = state(0);
 * count.value++;
 */
export function state<T>(value: T): State<T> {
  return new Signal(value);
}

/** Checks whether `object` was created by {@link state} or {@link derive}. */
export function isReactive(object: unknown): object is State<unknown> {
  return object instanceof Signal;
}

export { Signal };
