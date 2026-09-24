import { bindAttribute } from "./attributes.js";
import { toNodes } from "./children.js";

/** Marks a JSX fragment (`<>...</>`): its children are returned as a node array. */
export const fragment = Symbol("fragment");

type Props = Record<string, any>;
type Component = (props: Props) => any;

/**
 * Builds real DOM nodes from JSX.
 *
 * - `fragment` returns its children as an array of nodes.
 * - A function tag is called as a component with `{ ...props, children }`.
 * - A string tag creates an HTML element: `on*` function props become event
 *   listeners, everything else becomes an attribute.
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
  if (tag === fragment) return toNodes(children);
  if (typeof tag === "function") return tag({ ...props, children });

  const element = document.createElement(tag);

  for (const [key, value] of Object.entries(props ?? {})) {
    if (key.startsWith("on") && typeof value === "function") {
      element.addEventListener(key.slice(2).toLowerCase(), value);
    } else {
      bindAttribute(element, key, value);
    }
  }

  element.append(...toNodes(children));
  return element;
}
