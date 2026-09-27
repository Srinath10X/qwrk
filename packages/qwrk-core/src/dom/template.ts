/**
 * Returns a function that clones the element `html` describes. The HTML is
 * parsed on the first call only. With `svg`, it is parsed inside an `<svg>`,
 * so its elements are SVG elements.
 *
 * @param html - Markup of one element, static parts only.
 * @param svg - Whether the element is an SVG element.
 */
export function template(html: string, svg?: boolean) {
  let node: Node | undefined;

  return () => (node ??= parse(html, svg)).cloneNode(true);
}

/**
 * Parses the element, then imports it into the page's document, so its
 * clones are not adopted again when they are inserted.
 */
function parse(html: string, svg?: boolean) {
  const holder = document.createElement("template");
  holder.innerHTML = svg ? `<svg>${html}</svg>` : html;
  const root = holder.content.firstChild!;
  return document.importNode(svg ? root.firstChild! : root, true);
}
