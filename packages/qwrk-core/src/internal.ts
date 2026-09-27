import { append } from "#qwrk/dom/children.js";
import { is, isReactive } from "#qwrk/reactivity/state.js";

export { bindAttribute as attr } from "#qwrk/dom/attributes.js";
export { append as insert, text } from "#qwrk/dom/children.js";
export { delegate } from "#qwrk/dom/events.js";
export { map } from "#qwrk/dom/list.js";
export { template } from "#qwrk/dom/template.js";
export { untrack as component } from "#qwrk/reactivity/state.js";

/**
 * Returns `children` in a `DocumentFragment`, like a JSX fragment.
 */
export function group(children: unknown[]) {
  const nodes = document.createDocumentFragment();
  append(nodes, children);
  return nodes;
}

/**
 * `a.value === b`, subscribing to `b` only when `a` is a state, see
 * `State.is`. Compiled JSX calls it for that comparison.
 */
export function equals(a: any, b: unknown) {
  return isReactive(a) ? is(a, b) : a.value === b;
}
