import { touch, track, type Signal } from "#qwrk/reactivity/state.js";

/** Array methods that change the array in place. Each call notifies once. */
const MUTATORS = new Set(
  "push pop shift unshift splice sort reverse fill copyWithin".split(" "),
);

/** Array methods that look an item up, so they find it wrapped or not. */
const SEARCHES = new Set("includes indexOf lastIndexOf".split(" "));

/** Each proxy's original object, so it can be stored unwrapped. */
const originals = new WeakMap<object, object>();

/** Returns the object a proxy wraps, or `value` itself. */
export function toRaw<T>(value: T): T {
  return (originals.get(value as object) as T | undefined) ?? value;
}

/**
 * Only arrays and plain objects are wrapped, not states, DOM nodes, `Map`,
 * `Date`...
 */
export function isPlain(value: unknown): value is object {
  if (typeof value !== "object" || value === null) return false;
  const proto = Object.getPrototypeOf(value);
  return Array.isArray(value) || proto === Object.prototype || proto === null;
}

function handler(source: Signal<any>): ProxyHandler<any> {
  return {
    get(target, key, receiver) {
      const item = Reflect.get(target, key, receiver);
      track(source);

      if (Array.isArray(target) && MUTATORS.has(key as string)) {
        return (...args: unknown[]) => {
          const result = (item as Function).apply(target, args.map(toRaw));
          touch(source);
          return result === target ? receiver : result;
        };
      }
      if (Array.isArray(target) && SEARCHES.has(key as string)) {
        return (search: unknown, ...rest: unknown[]) =>
          (item as Function).call(receiver, deep(search, source), ...rest);
      }

      return deep(item, source);
    },

    set(target, key, next) {
      const raw = toRaw(next);
      const change = !(key in target) || !Object.is(target[key], raw);
      const done = Reflect.set(target, key, raw);
      if (change) touch(source);
      return done;
    },

    deleteProperty(target, key) {
      const had = key in target;
      const done = Reflect.deleteProperty(target, key);
      if (had) touch(source);
      return done;
    },
  };
}

/**
 * Wraps arrays and plain objects, at any depth, so that changing them in place
 * (`push`, `list[0] = x`, `user.name = x`) notifies `source`, and reading
 * them tracks it. The same object always gets the same proxy, even when it's
 * stored wrapped.
 *
 * @param value - Value to wrap.
 * @param source - The state it belongs to.
 */
export function deep<T>(value: T, source: Signal<any>): T {
  if (!isPlain(value)) return value;

  const raw = toRaw(value) as object;
  const proxies = (source.m ??= new WeakMap());
  let proxy = proxies.get(raw);

  if (!proxy) {
    proxy = new Proxy<object>(raw, (source.h ??= handler(source)));
    proxies.set(raw, proxy);
    originals.set(proxy, raw);
  }

  return proxy as T;
}
