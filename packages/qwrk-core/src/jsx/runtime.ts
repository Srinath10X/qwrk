import { build, fragment } from "#qwrk/dom/createElement.js";
import type { IntrinsicElements as Elements } from "#qwrk/jsx/types.js";
import { untrack } from "#qwrk/reactivity/state.js";

/**
 * Tags created as SVG. `a`, `script`, `style` and `title` exist in both
 * namespaces and stay HTML. Only the automatic runtime needs this list:
 * compiled JSX resolves the namespace statically.
 */
const SVG_TAGS = new Set(
  (
    "svg animate animateMotion animateTransform circle clipPath defs desc " +
    "ellipse filter foreignObject g image line linearGradient marker mask " +
    "metadata mpath path pattern polygon polyline radialGradient rect set " +
    "stop switch symbol text textPath tspan use view"
  ).split(" "),
);

/**
 * Automatic JSX runtime entry, used when a bundler is configured with
 * `jsxImportSource: "qwrk"`. Children arrive in `props.children`.
 *
 * @param tag - Tag name, component function, or `Fragment`.
 * @param props - Props including `children`.
 */
export function jsx(tag: any, { children, ...props }: Record<string, any>) {
  const ns =
    typeof tag === "string" && (SVG_TAGS.has(tag) || /^fe[A-Z]/.test(tag))
      ? "http://www.w3.org/2000/svg"
      : null;
  return untrack(() =>
    build(
      ns,
      tag,
      props,
      children === undefined
        ? []
        : Array.isArray(children)
          ? children
          : [children],
    ),
  );
}

export { jsx as jsxs, jsx as jsxDEV, fragment as Fragment };

export namespace JSX {
  export type Element = Node;
  export interface IntrinsicElements extends Elements {}
}
