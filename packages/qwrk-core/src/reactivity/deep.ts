/** Array methods that change the array in place. Each call notifies once. */
const MUTATORS = new Set([
  "push",
  "pop",
  "shift",
  "unshift",
  "splice",
  "sort",
  "reverse",
  "fill",
  "copyWithin",
]);

/** Each proxy's original object, so it can be stored unwrapped. */
const originals = new WeakMap<object, object>();

/** Returns the object a proxy wraps, or `value` itself. */
export function toRaw<T>(value: T): T {
  return (originals.get(value as object) as T | undefined) ?? value;
}

/** Only arrays and plain objects are wrapped, not DOM nodes, `Map`, `Date`... */
function isPlain(value: unknown): value is object {
  if (typeof value !== "object" || value === null) return false;
  const proto = Object.getPrototypeOf(value);
  return Array.isArray(value) || proto === Object.prototype || proto === null;
}

/**
 * Wraps arrays and plain objects, at any depth, so that changing them in place
 * (`push`, `list[0] = x`, `user.name = x`) calls `notify`.
 *
 * @param value - Value to wrap.
 * @param notify - Called after every change.
 * @param proxies - Cache that keeps one proxy per object, so `===` holds.
 */
export function deep<T>(
  value: T,
  notify: () => void,
  proxies: WeakMap<object, object>,
): T {
  if (!isPlain(value)) return value;

  let proxy = proxies.get(value);

  if (!proxy) {
    proxy = new Proxy<object>(value, {
      get(target, key, receiver) {
        const item = Reflect.get(target, key, receiver);

        if (Array.isArray(target) && MUTATORS.has(key as string)) {
          return (...args: unknown[]) => {
            const result = (item as Function).apply(target, args.map(toRaw));
            notify();
            return result === target ? receiver : result;
          };
        }

        return deep(item, notify, proxies);
      },

      set(target, key, next) {
        const done = Reflect.set(target, key, toRaw(next));
        notify();
        return done;
      },

      deleteProperty(target, key) {
        const done = Reflect.deleteProperty(target, key);
        notify();
        return done;
      },
    });

    proxies.set(value, proxy);
    originals.set(proxy, value);
  }

  return proxy as T;
}
