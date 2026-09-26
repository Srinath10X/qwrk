import {
  bind,
  Binding,
  isReactive,
  peek,
  retain,
  watch,
} from "#qwrk/reactivity/state.js";

/**
 * The nodes a state or a function currently renders as. Its nodes keep it
 * alive.
 */
interface Slot {
  nodes: ChildNode[];
}

/**
 * Inserts JSX children into `parent`, before `marker` or at the end, one at a
 * time, so any number of them fits. Nested arrays are flattened, and states
 * and functions become nodes that update in place: a function is called
 * again whenever a state it reads changes.
 */
export function append(parent: Node, children: unknown, marker?: Node | null) {
  if (Array.isArray(children)) {
    for (const child of children) append(parent, child, marker);
  } else if (typeof children === "function") {
    const slot = new Child(parent, marker, children as () => unknown);
    bind(slot);
    if (slot.q != 3) for (const node of slot.nodes) retain(node, slot);
  } else if (isReactive(children)) {
    const slot: Slot = { nodes: render(peek(children)) };
    place(parent, slot, marker, true);
    watch(children, slot, update);
  } else if (
    !marker &&
    !parent.hasChildNodes() &&
    !(children instanceof Node)
  ) {
    parent.textContent = toText(children);
  } else {
    parent.insertBefore(toNode(children), marker ?? null);
  }
}

/**
 * A function child: renders what the function returns, again whenever a
 * state it read changes.
 */
class Child extends Binding implements Slot {
  nodes!: ChildNode[];

  constructor(
    private parent: Node | null,
    private marker: Node | null | undefined,
    readonly g: () => unknown,
  ) {
    super();
  }

  f() {
    const value = read(this.g());
    if (this.nodes) return update(this, 0, value);
    this.nodes = render(value);
    place(this.parent!, this, this.marker);
    this.parent = this.marker = null;
  }
}

/** The value of a state, read so the running computation tracks it, or `value`. */
export function read(value: unknown) {
  return isReactive(value) ? value.value : value;
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
  const nodes =
    Array.isArray(value) ||
    value instanceof DocumentFragment ||
    typeof value === "function" ||
    isReactive(value)
      ? collect(value, [])
      : [toNode(value)];
  return nodes.length ? nodes : [document.createTextNode("")];
}

/**
 * States and functions nested in the value render between two empty texts,
 * so that the nodes they swap stay between the first and last nodes.
 */
function collect(value: unknown, nodes: ChildNode[]) {
  if (Array.isArray(value)) {
    for (const item of value) collect(item, nodes);
  } else if (value instanceof DocumentFragment) {
    for (const node of value.childNodes) nodes.push(node);
  } else if (typeof value === "function" || isReactive(value)) {
    const group = document.createDocumentFragment();
    append(group, ["", value, ""]);
    collect(group, nodes);
  } else {
    nodes.push(toNode(value));
  }
  return nodes;
}

/**
 * Inserts the slot's nodes into `parent`, and with `keep`, makes each keep
 * the slot alive.
 */
function place(parent: Node, slot: Slot, marker?: Node | null, keep?: boolean) {
  for (const node of slot.nodes) {
    if (keep) retain(node, slot);
    parent.insertBefore(node, marker ?? null);
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
  const isText =
    value === null || (typeof value != "object" && typeof value != "function");

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
  place(nodes, slot, null, true);
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
