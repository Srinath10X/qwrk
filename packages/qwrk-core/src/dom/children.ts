import {
  isReactive,
  peek,
  retain,
  watch,
  type State,
} from "#qwrk/reactivity/state.js";

/** The nodes a state currently renders as. Its nodes keep it alive. */
interface Slot {
  nodes: ChildNode[];
}

/**
 * Appends JSX children to `parent` one at a time, so any number of them fits.
 * Nested arrays are flattened, and states become nodes that update in place
 * when written.
 */
export function append(parent: Node, children: unknown) {
  if (Array.isArray(children)) {
    for (const child of children) append(parent, child);
  } else if (isReactive(children)) {
    const slot: Slot = { nodes: render(peek(children)) };
    place(parent, slot);
    watch(children, slot, update);
  } else {
    parent.appendChild(toNode(children));
  }
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
  const nodes = collect(value, []);
  return nodes.length ? nodes : [document.createTextNode("")];
}

function collect(value: unknown, nodes: ChildNode[]) {
  if (Array.isArray(value)) {
    for (const item of value) collect(item, nodes);
  } else if (value instanceof DocumentFragment) {
    for (const node of value.childNodes) nodes.push(node);
  } else {
    nodes.push(toNode(value));
  }
  return nodes;
}

/** Appends the slot's nodes to `parent`, and makes each keep the slot alive. */
function place(parent: Node, slot: Slot) {
  for (const node of slot.nodes) {
    retain(node, slot);
    parent.appendChild(node);
  }
}

/**
 * Text updates reuse the same node; anything else replaces the nodes. When
 * its first and last nodes are still in place, everything between them goes
 * too, such as the rows a list added since.
 */
function update(slot: Slot, _: unknown, value: unknown) {
  const [first] = slot.nodes;
  const last = slot.nodes[slot.nodes.length - 1];
  const isText = !(value instanceof Node) && !Array.isArray(value);

  if (first === last && first instanceof Text && isText) {
    first.data = toText(value);
    return;
  }

  const anchor = document.createTextNode("");
  const nodes = document.createDocumentFragment();
  first.before(anchor);
  if (last.parentNode === anchor.parentNode) relocate(first, last);
  else slot.nodes.forEach((node) => node.remove());
  slot.nodes = render(value);
  place(nodes, slot);
  anchor.replaceWith(nodes);
}

/**
 * Moves `first`, `last` and the nodes between them before `anchor`, or removes
 * them when there is no `anchor`.
 */
export function relocate(
  first: ChildNode,
  last: ChildNode,
  anchor?: ChildNode,
) {
  for (let node = first, next; ; node = next) {
    next = node.nextSibling!;
    anchor ? anchor.before(node) : node.remove();
    if (node === last || !next) return;
  }
}
