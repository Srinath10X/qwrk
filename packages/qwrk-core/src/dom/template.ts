/**
 * Returns a function that clones the element `html` describes. The HTML is
 * parsed on the first call only. With `svg`, it is parsed inside an `<svg>`,
 * so its elements are SVG elements.
 *
 * Clones belong to the template's inert document until they are inserted,
 * which adopts them: creating nodes there is cheaper than in the page's
 * document. With `adopt`, the element is imported into the page's document
 * once, so its clones start there, for markup that behaves differently
 * before insertion: custom elements, and URLs that resolve against the page.
 *
 * @param html - Markup of one element, static parts only.
 * @param svg - Whether the element is an SVG element.
 * @param adopt - Whether clones start in the page's document.
 */
export function template(html: string, svg?: boolean, adopt?: boolean) {
  let node: Node | undefined;

  return () => (node ??= parse(html, svg, adopt)).cloneNode(true);
}

function parse(html: string, svg?: boolean, adopt?: boolean) {
  const holder = document.createElement("template");
  holder.innerHTML = svg ? `<svg>${html}</svg>` : html;
  const root = holder.content.firstChild!;
  const node = svg ? root.firstChild! : root;
  return adopt ? document.importNode(node, true) : node;
}
