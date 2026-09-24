import { isReactive, type State } from "../reactivity/state.js";

/**
 * Turns JSX children into DOM nodes. Nested arrays are flattened, and states
 * become nodes that update in place when written.
 */
export function toNodes(children: unknown[]): Node[] {
  return children
    .flat(Infinity)
    .map((child) =>
      isReactive(child) ? toReactiveNode(child) : toNode(child),
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
 * Text updates reuse the same node; switching to or from an element replaces it.
 */
function toReactiveNode(source: State<unknown>) {
  let node = toNode(source.value);

  source.effect((value) => {
    if (node instanceof Text && !(value instanceof Node)) {
      node.data = toText(value);
      return;
    }

    const next = toNode(value);
    node.replaceWith(next);
    node = next;
  });

  return node;
}
