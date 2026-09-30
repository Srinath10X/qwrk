/**
 * Listens to each event on the document, once per name: the DOM ignores a
 * listener that is already there. A delegated event
 * walks up from its target, calling each element's `$$` + name handler with
 * the element as `this` and `currentTarget`, until one stops propagation.
 * The handler gets the element's `$$` + name + `Data` after the event.
 * Compiled JSX delegates the bubbling events it sets handlers for.
 *
 * @param names - Event names, such as `"click"`.
 */
export function delegate(names: string[]) {
  for (const name of names) document.addEventListener(name, dispatch);
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
      handler.call(node, event, node[key + "Data"]);
      if ((event as { cancelBubble?: boolean }).cancelBubble) return;
    }
  }
}
