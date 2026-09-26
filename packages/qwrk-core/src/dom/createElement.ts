import { bindAttribute } from "#/dom/attributes.js";
import { toNodes } from "#/dom/children.js";
import { track } from "#/reactivity/state.js";

/** Marks a JSX fragment (`<>...</>`): its children are returned in a `DocumentFragment`. */
export const fragment = Symbol("fragment");

/**
 * Tags created as SVG. `a`, `script`, `style` and `title` exist in both
 * namespaces and stay HTML.
 */
const SVG_TAGS = new Set(
  (
    "svg animate animateMotion animateTransform circle clipPath defs desc " +
    "ellipse filter foreignObject g image line linearGradient marker mask " +
    "metadata mpath path pattern polygon polyline radialGradient rect set " +
    "stop switch symbol text textPath tspan use view"
  ).split(" "),
);

type Props = Record<string, any>;
type Component = (props: any) => any;

/**
 * Builds real DOM nodes from JSX.
 *
 * - `fragment` returns its children in a `DocumentFragment`, so
 *   `root.append(<App />)` works for fragments and single elements alike.
 * - A function tag is called as a component with `{ ...props, children }`.
 * - A string tag creates an HTML element, or an SVG element for SVG tags:
 *   `on*` function props become event listeners, everything else becomes an
 *   attribute.
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
  return track(() => build(tag, props, children)).value;
}

function build(
  tag: string | Component | typeof fragment,
  props: Props | null,
  children: unknown[],
) {
  if (tag === fragment) {
    const nodes = document.createDocumentFragment();
    nodes.append(...toNodes(children));
    return nodes;
  }
  if (typeof tag === "function") return tag({ ...props, children });

  const element =
    SVG_TAGS.has(tag) || /^fe[A-Z]/.test(tag)
      ? document.createElementNS("http://www.w3.org/2000/svg", tag)
      : document.createElement(tag);

  element.append(...toNodes(children));

  for (const [key, value] of Object.entries(props ?? {})) {
    if (key.startsWith("on") && typeof value === "function") {
      element.addEventListener(key.slice(2).toLowerCase(), value);
    } else {
      bindAttribute(element, key, value);
    }
  }

  return element;
}
