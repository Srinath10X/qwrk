import { createElement, fragment } from "#/dom/createElement.js";

/**
 * Automatic JSX runtime entry, used when a bundler is configured with
 * `jsxImportSource: "qwrk"`. Children arrive in `props.children`.
 *
 * @param tag - Tag name, component function, or `Fragment`.
 * @param props - Props including `children`.
 */
export function jsx(tag: any, { children, ...props }: Record<string, any>) {
  if (children === undefined) return createElement(tag, props);
  return createElement(
    tag,
    props,
    ...(Array.isArray(children) ? children : [children]),
  );
}

export { jsx as jsxs, jsx as jsxDEV, fragment as Fragment };

export namespace JSX {
  export type Element = Node;
  export interface IntrinsicElements {
    [tag: string]: Record<string, any>;
  }
}
