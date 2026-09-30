/**
 * Returns a function that clones the HTML element `html` describes. The HTML
 * is parsed on the first call only.
 *
 * Clones belong to the template's inert document until they are inserted,
 * which adopts them: creating nodes there is cheaper than in the page's
 * document. Compiled JSX calls it for markup that behaves the same either
 * way, and {@link template} for the rest.
 *
 * @param html - Markup of one HTML element, static parts only.
 */
export function clone(html: string) {
  let node: Node | undefined;

  return () => (node ??= parse(html)).cloneNode(true);
}

/**
 * {@link clone} for any element. With `svg`, it is parsed inside an `<svg>`,
 * so its elements are SVG elements. With `adopt`, the element is imported
 * into the page's document once, so its clones start there, for markup that
 * behaves differently before insertion: custom elements, and URLs that
 * resolve against the page.
 *
 * @param html - Markup of one element, static parts only.
 * @param svg - Whether the element is an SVG element.
 * @param adopt - Whether clones start in the page's document.
 */
export function template(html: string, svg?: boolean, adopt?: boolean) {
  let node: Node | undefined;

  return () => {
    if (!node) {
      const root = parse(svg ? `<svg>${html}</svg>` : html);
      node = svg ? root.firstChild! : root;
      if (adopt) node = document.importNode(node, true);
    }
    return node.cloneNode(true);
  };
}

/** Parses the first node of `html` in the inert document of a template. */
function parse(html: string) {
  const holder = document.createElement("template");
  holder.innerHTML = html;
  return holder.content.firstChild!;
}
