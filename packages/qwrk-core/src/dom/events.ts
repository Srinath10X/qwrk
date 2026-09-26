/** Event names with a listener on the document. */
const delegated = new Set<string>();

/**
 * Listens to each event on the document, once per name. A delegated event
 * walks up from its target, calling each element's `$$` + name handler with
 * the element as `this` and `currentTarget`, until one stops propagation.
 * Compiled JSX delegates the bubbling events it sets handlers for.
 *
 * @param names - Event names, such as `"click"`.
 */
export function delegate(names: string[]) {
  for (const name of names) {
    if (!delegated.has(name)) {
      delegated.add(name);
      document.addEventListener(name, dispatch);
    }
  }
}

function dispatch(event: Event) {
  const key = "$$" + event.type;
  let node: any = event.target;

  Object.defineProperty(event, "currentTarget", {
    configurable: true,
    get: () => node || document,
  });

  for (; node; node = node.parentNode || node.host) {
    const handler = node[key];

    if (handler) {
      handler.call(node, event);
      if (event.cancelBubble) return;
    }
  }
}
