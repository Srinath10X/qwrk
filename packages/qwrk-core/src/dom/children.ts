import { isReactive, type State } from "#/reactivity/state.js";

/**
 * Turns JSX children into DOM nodes. Nested arrays are flattened, and states
 * become nodes that update in place when written.
 */
export function toNodes(children: unknown[]): Node[] {
  return children
    .flat(Infinity)
    .flatMap((child) =>
      isReactive(child) ? toReactiveNodes(child) : toNode(child),
    );
}

/**
 * `false`, `true`, `null` and `undefined` render as empty text.
 */
function toText(value: unknown) {
  return value == null || typeof value === "boolean" ? "" : String(value);
}

function toNode(value: unknown): ChildNode {
  return value instanceof Node
    ? (value as ChildNode)
    : document.createTextNode(toText(value));
}

/**
 * Renders a state's value: a primitive, a node, a fragment or an array of
 * them. Always returns at least one node, so the next update has a position.
 */
function render(value: unknown): ChildNode[] {
  const nodes = [value]
    .flat(Infinity)
    .flatMap((item) =>
      item instanceof DocumentFragment
        ? [...(item.childNodes as NodeListOf<ChildNode>)]
        : [toNode(item)],
    );
  return nodes.length ? nodes : [document.createTextNode("")];
}

/**
 * Text updates reuse the same node; anything else replaces the nodes.
 */
function toReactiveNodes(source: State<unknown>) {
  let nodes = render(source.value);

  source.effect((value) => {
    const [first] = nodes;
    const isText = !(value instanceof Node) && !Array.isArray(value);

    if (nodes.length === 1 && first instanceof Text && isText) {
      first.data = toText(value);
      return;
    }

    const next = render(value);
    const anchor = document.createTextNode("");
    first.before(anchor);
    nodes.forEach((node) => node.remove());
    anchor.replaceWith(...next);
    nodes = next;
  });

  return nodes;
}
