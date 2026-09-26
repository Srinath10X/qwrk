import { list } from "#qwrk/dom/list.js";
import { deep, isPlain, toRaw } from "#qwrk/reactivity/deep.js";

/** Called with the new and previous value after every change. */
export type Effect<T> = (value: T, oldValue: T) => void;

/** A reactive value created by {@link state} or {@link derive}. */
export interface State<T> {
  value: T;
  /** Runs `fn` after every change. Returns a function that stops it. */
  effect(fn: Effect<T>): () => void;
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
  /** The subscriptions of the source it belongs to. */
  o: Set<Entry>;
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
  /**
   * Derives only: their subscribers, value and version. Lists and their rows
   * have an unused `o` too, so that, like a derive, they own the derives
   * created in them.
   */
  o?: Set<Entry>;
  _?: unknown;
  v?: number;
}

const KEEP = Symbol();
const REF = Symbol();

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
 * Stale derives, DOM bindings with their source, and stale effects, run in
 * that order.
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
  o = new Set<Entry>();

  constructor(value: T) {
    this._ = toRaw(value);
  }

  get value(): T {
    refresh(this as any);
    track(this);
    return (this as any).f ? this._ : deep(this._, this);
  }

  set value(next: T) {
    next = toRaw(next);
    if (!Object.is(this._, next)) {
      this._ = next;
      touch(this);
    }
  }

  map(fn: (item: any) => unknown) {
    return list(this, fn);
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
}

/** Records that `source` changed and notifies its subscribers. */
export function touch(source: Signal<any>) {
  source.v++;
  if (seen?.has(source)) seen.set(source, source.v);
  notify(source);
  depth || flush();
}

/** Tracks `source` as a dependency of the running derive or effect. */
export function track(source: Signal<any>) {
  if (reads && !reads.has(source)) reads.set(source, source.v);
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
    else if (entry.f) deep || queue[1].set(entry, source);
    else if (!sub.q) stale(sub);
  }
}

/** Marks a derive or an effect stale and queues it, with what depends on it. */
function stale(node: Computation) {
  node.q = 1;
  queue[node.o ? 0 : 2].add(node);
  if (node.o) notify(node as any, true);
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
        for (const [source, entry] of node.s) {
          refresh(source as any);
          if (entry.v != source.v) return run(node);
        }
        for (const [source, entry] of node.s) {
          if (entry.v != source.v) return run(node);
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
  const reading = new Map<Signal<any>, number>();
  const outerReads = reads;
  const outerSeen = seen;
  const outerOwner = owner;

  depth++;

  try {
    node.c.length && node.c.splice(0).forEach(dispose);
    node.q = 2;
    reads = node.d ? null : reading;
    seen = reading;
    owner = node;
    const value = node.f();
    if (node.o && (!Object.is(node._, value) || isPlain(value))) {
      node._ = value;
      touch(node as any);
    }
  } finally {
    reads = outerReads;
    seen = outerSeen;
    owner = outerOwner;

    if (node.q == 2) {
      node.q = 0;
      node.d?.forEach((source) => reading.set(source, source.v));
      node.s.forEach(
        (entry, source) =>
          reading.has(source) || (unlink(entry), node.s.delete(source)),
      );
      reading.forEach((version, source) => {
        let entry = node.s.get(source);
        if (!entry) node.s.set(source, (entry = link(source, node)));
        entry.v = version;
        version == source.v || node.q || stale(node);
      });

      if (!node.s.size && !node.o && !node.p) {
        node.c.splice(0).forEach(adopt);
        roots.delete(node);
      }
    }

    --depth || flush();
  }
}

/** Makes an effect whose owner will never re-run a root, alive until stopped. */
function adopt(node: Computation) {
  if (node.q != 3) {
    node.p = null;
    roots.add(node);
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

/**
 * Makes `node` a derive, an effect or a list, owned by the running derive,
 * effect or list row, if any: an effect owns only effects, the others own all
 * three. A disposed one owns nothing, since it will never stop what it
 * created.
 */
export function computation<T extends object>(
  node: T,
  fn: () => unknown,
  deps?: unknown[],
): T & Computation {
  const parent = owner?.q != 3 && (owner?.o || !(node as any).o) ? owner : null;
  const created = Object.assign(node, {
    f: fn,
    s: new Map(),
    d: deps && new Set(deps.filter(isReactive) as Signal<any>[]),
    c: [],
    p: parent,
    q: 0,
  });
  parent?.c.push(created);
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

/**
 * Subscribes `owner` to `source`, weakly, until it is unlinked or `owner` is
 * garbage collected.
 */
function link(source: Signal<any>, owner: object, f?: Listener, d?: unknown) {
  const entry: Entry = {
    r: ((owner as any)[REF] ??= new WeakRef(owner)),
    o: source.o,
    f,
    d,
  };
  source.o.add(entry);
  registry.register(owner, entry, f ? undefined : entry);
  return entry;
}

function unlink(entry: Entry) {
  entry.o.delete(entry);
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
 * Runs `fn` without collecting the states it reads.
 */
export function untrack<T>(fn: () => T): T {
  return own(owner, fn);
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

export type { Signal };
