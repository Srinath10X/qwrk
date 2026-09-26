import { build, fragment } from "#qwrk/dom/createElement.js";
import type { IntrinsicElements as Elements } from "#qwrk/jsx/types.js";
import { untrack } from "#qwrk/reactivity/state.js";

/**
 * Automatic JSX runtime entry, used when a bundler is configured with
 * `jsxImportSource: "qwrk"`. Children arrive in `props.children`.
 *
 * @param tag - Tag name, component function, or `Fragment`.
 * @param props - Props including `children`.
 */
export function jsx(tag: any, { children, ...props }: Record<string, any>) {
  return untrack(() =>
    build(
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
