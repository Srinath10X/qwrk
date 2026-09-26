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
 * A subscription to a state. It reaches its subscriber through a `WeakRef`,
 * so the subscriber can be garbage collected, and never references the state,
 * whose value may hold the subscriber.
 */
interface Entry {
  r: WeakRef<object>;
  /** The subscriptions of the source it belongs to, or the key it belongs to. */
  o: Entry[] | Key;
  /** Its position in them. */
  i: number;
  /** DOM bindings only: updates the owner. */
  f?: Listener;
  /** DOM bindings only: passed to `f`. */
  d?: unknown;
  /** Derives and effects only: the source's version their last run saw. */
  v?: number;
}

/**
 * A derive, an effect or a DOM binding. Its fields live on the derive's state,
 * or on a plain object for the others.
 */
export interface Computation {
  /** Runs it. A derive's value is the result. */
  f: () => unknown;
  /** The states it depends on, each followed by its subscription. */
  s: any[];
  /** Explicit dependencies, instead of tracking reads. */
  d?: Set<Signal<any>>;
  /** What its last run created, once it created something. */
  c?: Computation[];
  /** The computation whose run created it. */
  p: Computation | null;
  /** 0 up to date, 1 stale, 2 running, 3 disposed. */
  q: number;
  /** Derives only: their subscribers, value and version. */
  o?: Entry[];
  _?: unknown;
  v?: number;
  /** Effects only: they run after the DOM bindings, and own only effects. */
  e?: 1;
}

const KEEP = Symbol();
const REF = Symbol();
const NONE: any[] = [];

/**
 * States read while a derive or an effect runs, with their version when first
 * read, or `null` outside of one.
 */
let reads: Map<Signal<any>, number> | null = null;

/**
 * The reads of the derive or effect running now, even inside {@link untrack}:
 * its own writes update their versions, so they don't make it stale.
 */
let seen: Map<Signal<any>, number> | null = null;

/** The derive or effect running now: it owns what it creates. */
let owner: Computation | null = null;

/** Above 0 inside {@link batch}, a run or a flush: changes wait for the flush. */
let depth = 0;

/**
 * Stale derives, DOM bindings (with their source, or stale ones), and stale
 * effects, run in that order.
 */
const queue: any[] = [new Set(), new Map(), new Set()];

/** Effects created outside of a derive or an effect, alive until stopped. */
const roots = new Set<Computation>();

/** The first error a job threw in the running flush. */
let error: [unknown] | undefined;

/**
 * Drops the subscriptions of garbage collected DOM bindings, derives and
 * effects, even from a state that is never written again.
 */
const registry = new FinalizationRegistry<Entry>(unlink);

class Signal<T> {
  /** The raw value. */
  declare _: T;
  /** One proxy per wrapped object. */
  declare m?: WeakMap<object, object>;
  /** The traps shared by its proxies. */
  declare h?: ProxyHandler<any>;
  /** Bumped on every change. */
  v = 0;
  /** Subscriptions. */
  o: Entry[] = NONE;
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
  if (seen?.has(source)) seen.set(source, source.v);
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

/** Tracks `source` as a dependency of the running derive or effect. */
export function track(source: Signal<any>) {
  if (reads && !reads.has(source)) reads.set(source, source.v);
}

/** Returns the raw value of `source`, up to date, without tracking it. Signals hold their value, so only derives refresh. */
export function peek<T>(source: State<T>): T {
  const signal = source as Signal<T>;
  if ((signal as unknown as { q?: number }).q === undefined)
    return toRaw(signal._);
  refresh(signal as any);
  return toRaw(signal._);
}

/**
 * Queues `source`'s DOM bindings, and marks its computations stale,
 * with everything that depends on them. With `deep`, DOM bindings are
 * skipped: a stale derive queues its own once its value actually changes.
 */
function notify(source: Signal<any>, deep?: boolean) {
  const entries = source.o;

  for (let i = 0; i < entries.length;) {
    const entry = entries[i];
    const sub = entry.r.deref() as Computation | undefined;

    if (!sub) {
      unlink(entry);
      continue;
    }
    if (entry.f) deep || queue[1].set(entry, source);
    else if (!sub.q) stale(sub);
    i++;
  }
}

/** Marks a computation stale and queues it, with what depends on it. */
function stale(node: Computation) {
  node.q = 1;
  if (node.o) {
    queue[0].add(node);
    notify(node as any, true);
  } else if (node.e) {
    queue[2].add(node);
  } else {
    queue[1].set(node);
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
      queue[i] = i == 1 ? new Map() : new Set();

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
        for (let i = 0; i < s.length; i += 2) {
          refresh(s[i]);
          if (s[i + 1].v != s[i].v) return run(node);
        }
        for (let i = 0; i < s.length; i += 2) {
          if (s[i + 1].v != s[i].v) return run(node);
        }
      } finally {
        if (node.q == 2) node.q = 0;
      }
    }
  }
}

/**
 * Runs a derive or an effect: disposes what its last run created, tracks what
 * it reads, then subscribes to new dependencies and drops old ones. Changes
 * it makes wait until it's done, and don't re-run it. A state another derive
 * wrote after this one read it makes it stale again.
 *
 * An unowned effect left with no dependencies never runs again, so it hands
 * the effects it created over to the roots, and stops being one.
 */
export function run(node: Computation) {
  if (node.q == 3) return;
  const old = node._;
  const reading = new Map<Signal<any>, number>();
  const outerReads = reads;
  const outerSeen = seen;
  const outerOwner = owner;

  depth++;

  try {
    node.c?.length && node.c.splice(0).forEach(dispose);
    node.q = 2;
    reads = node.d ? null : reading;
    seen = reading;
    owner = node;
    const value = node.f();
    if (node.o && (!Object.is(old, value) || isPlain(value))) {
      node._ = value;
      (node as any).k && select(node as any, old);
      touch(node as any);
    }
  } finally {
    reads = outerReads;
    seen = outerSeen;
    owner = outerOwner;

    if (node.q == 2) {
      node.q = 0;
      node.d?.forEach((source) => reading.set(source, source.v));
      subscribe(node, reading);

      if (!node.s.length && node.e && !node.p) {
        node.c?.splice(0).forEach((child) => adopt(child, null));
        roots.delete(node);
      }
    }

    --depth || flush();
  }
}

/**
 * Replaces the dependencies of `node` with the states it just read, keeping
 * the subscriptions it still needs, in an array of the exact size.
 */
function subscribe(node: Computation, reading: Map<Signal<any>, number>) {
  const old = node.s;
  const s = (node.s = reading.size ? Array(reading.size * 2) : NONE);
  let n = 0;

  for (let i = 0; i < old.length; i += 2) {
    const version = reading.get(old[i]);

    if (version === undefined) {
      unlink(old[i + 1]);
    } else {
      reading.delete(old[i]);
      old[i + 1].v = version;
      s[n++] = old[i];
      s[n++] = old[i + 1];
    }
  }
  reading.forEach((version, source) => {
    s[n++] = source;
    s[n++] = link(source, node);
    s[n - 1].v = version;
  });
  for (let i = 0; i < n; i += 2) {
    s[i + 1].v == s[i].v || node.q || stale(node);
  }
}

/**
 * Hands `node` over to `parent`, since its owner will never re-run. Without a
 * parent, an effect becomes a root, alive until stopped, and the rest live as
 * long as their DOM.
 */
function adopt(node: Computation, parent: Computation | null) {
  if (node.q != 3) {
    node.p = parent;
    if (parent) attach(parent, node);
    else if (node.e) roots.add(node);
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
    node.c?.splice(0).forEach(dispose);
    for (let i = 1; i < node.s.length; i += 2) unlink(node.s[i]);
    node.s = NONE;
    roots.delete(node);
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
    d: deps && new Set(deps.filter(isReactive) as Signal<any>[]),
    p: parent,
    q: 0,
  });
  if (parent) attach(parent, created);
  return created;
}

/**
 * A DOM binding: a computation whose `f` updates the DOM, and that runs
 * before the effects. Subclasses add the fields `f` reads, so a binding is one
 * object, without closures.
 */
export abstract class Binding implements Computation {
  s = NONE;
  p: Computation | null = null;
  q = 0;
  c?: Computation[] = undefined;
  [REF]?: WeakRef<object> = undefined;
  abstract f(): unknown;
}

/**
 * Runs `node` now, and again whenever a state it read changes. The running
 * derive, binding or list row owns it, like a derive, and when there is none,
 * `holder` keeps it alive. One that read no state will never run again, so it
 * hands what it created over to its owner.
 */
export function bind(node: Binding, holder?: object) {
  const parent = owner?.q != 3 && !owner?.e ? owner : null;
  node.p = parent;
  run(node);

  if (!node.s.length) {
    node.q = 3;
    node.c?.splice(0).forEach((child) => adopt(child, parent));
  } else if (parent) {
    attach(parent, node);
  } else if (holder) {
    retain(holder, node);
  }
}

/**
 * Creates an effect and runs it, now or once the page is loaded. Unless a
 * derive or an effect owns it, it lives until stopped.
 *
 * @returns A function that stops it.
 */
export function watcher(fn: () => void, deps?: unknown[], mounted?: boolean) {
  const node = computation({ e: 1 }, fn, deps);
  node.p || roots.add(node);

  function start() {
    run(node);
  }

  if (!mounted) start();
  else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    queueMicrotask(start);
  }

  return () => dispose(node);
}

/** Adds `node` to what `parent` created. */
function attach(parent: Computation, node: Computation) {
  if (parent.c) parent.c.push(node);
  else parent.c = [node];
}

/**
 * Subscribes `owner` to `source`, weakly, until it is unlinked or `owner` is
 * garbage collected. A key that left its map goes back in.
 */
function link(
  source: Signal<any> | Key,
  owner: object,
  f?: Listener,
  d?: unknown,
) {
  const key = source instanceof Key;
  const r = ((owner as any)[REF] ??= new WeakRef(owner));
  const o = source.o;
  const entry: Entry = f ? { r, o, i: o.length, f, d } : { r, o, i: o.length };

  if (entry.i) source.o.push(entry);
  else entry.o = source.o = [entry];
  if (key) {
    entry.o = source;
    if (!source.m.has(source.k)) source.m.set(source.k, source);
  }
  registry.register(owner, entry, f ? undefined : entry);
  return entry;
}

/**
 * Drops a subscription, moving the last one into its place. A key left
 * without any leaves its map.
 */
function unlink(entry: Entry) {
  const holder = entry.o;
  const entries = holder instanceof Key ? holder.o : holder;
  const i = entry.i;

  if (entries[i] === entry) {
    const last = entries.pop()!;
    if (last !== entry) (entries[i] = last).i = i;
    if (!entries.length && holder instanceof Key) holder.m.delete(holder.k);
  }
  registry.unregister(entry);
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
  retain(owner, source);
  link(source as any, owner, fn, data);
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
 * dependency of the running computation.
 */
export function trackKey(
  keys: Map<unknown, Key> | WeakMap<object, Key>,
  key: any,
) {
  if (reads) {
    let found = keys.get(key);
    if (!found) keys.set(key, (found = new Key(key, keys)));
    track(found as any);
  }
}

/**
 * A key of a map, with subscriptions of its own: a source that leaves the map
 * once it has none.
 */
export class Key {
  v = 0;
  o: Entry[] = NONE;

  constructor(
    readonly k: any,
    readonly m: Map<unknown, Key> | WeakMap<object, Key>,
  ) {}
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
