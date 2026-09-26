import { deep, isPlain, toRaw } from "#qwrk/reactivity/deep.js";

/** Called with the new and previous value after every change. */
export type Effect<T> = (value: T, oldValue: T) => void;

/** A reactive value created by {@link state} or {@link derive}. */
export interface State<T> {
  value: T;
  /** Runs `fn` after every change. Returns a function that stops it. */
  effect(fn: Effect<T>): () => void;
}

/** Updates a DOM binding's owner with the data given to {@link watch} and the new value. */
type Listener = (owner: any, data: any, value: any) => void;

/**
 * A subscription to a state. It reaches its subscriber through a `WeakRef`,
 * so the subscriber can be garbage collected.
 */
interface Entry {
  r: WeakRef<object>;
  /** The source. */
  s: Signal<any>;
  /** DOM bindings only: updates the owner. */
  f?: Listener;
  /** DOM bindings only: passed to `f`. */
  d?: unknown;
  /** Derives and effects only: the source's version their last run saw. */
  v?: number;
}

/**
 * A derive or an effect. Its fields live on the derive's state, or on a plain
 * object for effects.
 */
export interface Computation {
  /** Runs it. A derive's value is the result. */
  f: () => unknown;
  /** The states it depends on, with their subscriptions. */
  s: Map<Signal<any>, Entry>;
  /** Explicit dependencies, instead of tracking reads. */
  d?: Set<Signal<any>>;
  /** The derives and effects its last run created. */
  c: Computation[];
  /** The computation whose run created it. */
  p: Computation | null;
  /** 0 up to date, 1 stale, 2 running, 3 disposed. */
  q: number;
  /** Derives only: their subscribers, value and version. */
  o?: Set<Entry>;
  _?: unknown;
  v?: number;
}

const KEEP = Symbol();
const REF = Symbol();

/** States read while a derive or an effect runs, or `null` outside of one. */
let reads: Set<Signal<any>> | null = null;

/** The derive or effect running now: it owns the derives and effects created. */
let owner: Computation | null = null;

/** Above 0 inside {@link batch}, a run or a flush: changes wait for the flush. */
let depth = 0;

/** Stale derives, DOM bindings and stale effects, run in that order. */
const queue = [new Set<any>(), new Set<Entry>(), new Set<any>()];

/** Effects created outside of a derive or an effect, alive until stopped. */
const roots = new Set<Computation>();

/** The first error a job threw in the running flush. */
let error: [unknown] | undefined;

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
  o = new Set<Entry>();
  /** Subscriptions left to add before dropping those of collected owners. */
  n = 8;

  constructor(value: T) {
    this._ = toRaw(value);
  }

  get value(): T {
    refresh(this as any);
    reads?.add(this);
    return (this as any).f ? this._ : deep(this._, this);
  }

  set value(next: T) {
    next = toRaw(next);
    if (!Object.is(this._, next)) {
      this._ = next;
      touch(this);
    }
  }

  effect(fn: Effect<T>) {
    let old: T;
    let ran = false;
    return watcher(() => {
      const prev = old;
      old = this.value;
      ran ? fn(old, prev) : (ran = true);
    }, [this]);
  }
}

/** Records that `source` changed and notifies its subscribers. */
export function touch(source: Signal<any>) {
  source.v++;
  notify(source);
  depth || flush();
}

/** Tracks `source` as a dependency of the running derive or effect. */
export function track(source: Signal<any>) {
  reads?.add(source);
}

/** Returns the raw value of `source`, up to date, without tracking it. */
export function peek<T>(source: State<T>): T {
  refresh(source as any);
  return toRaw((source as Signal<T>)._);
}

/**
 * Queues `source`'s DOM bindings, and marks its derives and effects stale,
 * with everything that depends on them. With `deep`, DOM bindings are
 * skipped: a stale derive queues its own once its value actually changes.
 */
function notify(source: Signal<any>, deep?: boolean) {
  for (const entry of source.o) {
    const sub = entry.r.deref() as Computation | undefined;

    if (!sub) source.o.delete(entry);
    else if (entry.f) deep || queue[1].add(entry);
    else if (!sub.q) {
      sub.q = 1;
      queue[sub.o ? 0 : 2].add(sub);
      if (sub.o) notify(sub as any, true);
    }
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
      queue[i] = new Set();

      for (const job of jobs) {
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
            job.f(target, job.d, peek(job.s));
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
        for (const entry of node.s.values()) {
          refresh(entry.s as any);
          if (entry.v != entry.s.v) return run(node);
        }
        for (const entry of node.s.values()) {
          if (entry.v != entry.s.v) return run(node);
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
 * it makes wait until it's done, and don't re-run it.
 */
export function run(node: Computation) {
  if (node.q == 3) return;
  const deps = node.d || new Set<Signal<any>>();
  const outerReads = reads;
  const outerOwner = owner;

  depth++;

  try {
    node.c.length && node.c.splice(0).forEach(dispose);
    node.q = 2;
    reads = node.d ? null : deps;
    owner = node;
    const value = node.f();
    if (node.o && (!Object.is(node._, value) || isPlain(value))) {
      node._ = value;
      node.v!++;
      notify(node as any);
    }
  } finally {
    reads = outerReads;
    owner = outerOwner;

    if (node.q == 2) {
      node.q = 0;

      if (node.d && node.s.size) {
        for (const entry of node.s.values()) entry.v = entry.s.v;
      } else {
        node.s.forEach(
          (entry, source) =>
            deps.has(source) || (unlink(entry), node.s.delete(source)),
        );
        deps.forEach((source) => {
          let entry = node.s.get(source);
          if (!entry) node.s.set(source, (entry = link(source, node)));
          entry.v = source.v;
        });
        node.s.size || node.c.length || roots.delete(node);
      }
    }

    --depth || flush();
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
    node.c.splice(0).forEach(dispose);
    node.s.forEach(unlink);
    node.s.clear();
    roots.delete(node);
  }
}

/** Makes `node` a derive or an effect, owned by the running one, if any. */
export function computation<T extends object>(
  node: T,
  fn: () => unknown,
  deps?: unknown[],
): T & Computation {
  const created = Object.assign(node, {
    f: fn,
    s: new Map(),
    d: deps && new Set(deps.filter(isReactive) as Signal<any>[]),
    c: [],
    p: owner,
    q: 0,
  });
  owner?.c.push(created);
  return created;
}

/**
 * Creates an effect and runs it, now or once the page is loaded. Unless a
 * derive or an effect owns it, it lives until stopped.
 *
 * @returns A function that stops it.
 */
export function watcher(fn: () => void, deps?: unknown[], mounted?: boolean) {
  const node = computation({}, fn, deps);
  owner || roots.add(node);

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

/**
 * Subscribes `owner` to `source`, weakly. Every few subscriptions, drops those
 * of owners that were garbage collected, so they can't pile up.
 */
function link(source: Signal<any>, owner: object, f?: Listener, d?: unknown) {
  const entry: Entry = {
    r: ((owner as any)[REF] ??= new WeakRef(owner)),
    s: source,
    f,
    d,
  };
  source.o.add(entry);

  if (!--source.n) {
    source.n = 8;
    for (const old of source.o) {
      old.r.deref() ? source.n++ : source.o.delete(old);
    }
  }

  return entry;
}

function unlink(entry: Entry) {
  entry.s.o.delete(entry);
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

export type { Signal };
