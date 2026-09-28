import { bindAttribute } from "#qwrk/dom/attributes.js";
import { append } from "#qwrk/dom/children.js";
import { list } from "#qwrk/dom/list.js";
import { Signal, untrack, type State } from "#qwrk/reactivity/state.js";

/**
 * Adds {@link State.map} to states. It lives here, with the rest of the
 * runtime JSX, so that compiled apps, which import the list helper directly,
 * only ship lists when they render one.
 */
Signal.prototype.map = function (this: State<any>, fn: (item: any) => unknown) {
  return list(this, fn);
};

/** Marks a JSX fragment (`<>...</>`): its children are returned in a `DocumentFragment`. */
export const fragment = Symbol("fragment");

/** The namespace compiled SVG elements are created in. */
const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

type Props = Record<string, any>;
type Component = (props: any) => any;

/**
 * Builds real DOM nodes from JSX.
 *
 * - `fragment` returns its children in a `DocumentFragment`, so
 *   `root.append(<App />)` works for fragments and single elements alike.
 * - A function tag is called as a component with `{ ...props, children }`.
 * - A string tag creates an HTML element: `on*` function props become event
 *   listeners, everything else becomes an attribute. For SVG, use {@link svg}.
 *
 * @param tag - Tag name, component function, or `fragment`.
 * @param props - Attributes, event handlers, or component props.
 * @param children - Nodes, primitives, states, or nested arrays of them.
 */
export function createElement(
  tag: string | Component | typeof fragment,
  props: Props | null,
  ...children: unknown[]
) {
  return untrack(() => build(null, tag, props, children));
}

/**
 * Builds real DOM nodes from JSX in the SVG namespace, like
 * {@link createElement} but creating SVG elements. Compiled JSX calls it for
 * host elements the templates can't hold, such as spreads on SVG tags.
 *
 * @param tag - SVG tag name.
 * @param props - Attributes, event handlers, or component props.
 * @param children - Nodes, primitives, states, or nested arrays of them.
 */
export function svg(tag: string, props: Props | null, ...children: unknown[]) {
  return untrack(() => build(SVG_NAMESPACE, tag, props, children));
}

/** {@link createElement} with the children in an array, of any length. */
export function build(
  ns: string | null,
  tag: string | Component | typeof fragment,
  props: Props | null,
  children: unknown[],
) {
  if (tag === fragment) {
    const nodes = document.createDocumentFragment();
    append(nodes, children);
    return nodes;
  }
  if (typeof tag === "function") return tag({ ...props, children });

  const element = ns
    ? document.createElementNS(ns, tag as string)
    : document.createElement(tag as string);

  append(element, children);

  for (const key in props) {
    const value = props[key];
    if (key.startsWith("on") && typeof value === "function") {
      element.addEventListener(key.slice(2).toLowerCase(), value);
    } else {
      bindAttribute(element, key, value);
    }
  }

  return element;
}
