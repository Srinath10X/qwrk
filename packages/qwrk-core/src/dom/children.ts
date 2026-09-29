import {
  bind,
  Binding,
  dispose,
  is,
  isReactive,
  peek,
  retain,
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
  if (
    (typeof children !== "object" && typeof children !== "function") ||
    children === null
  ) {
    if (!marker && !parent.hasChildNodes()) {
      parent.textContent = toText(children);
    } else {
      parent.insertBefore(toNode(children), marker ?? null);
    }
  } else if (Array.isArray(children)) {
    for (const child of children) append(parent, child, marker);
  } else if (typeof children === "function") {
    const slot = new Child(parent, marker, children as () => unknown);
    bind(slot);
    if (slot.q != 3) for (const node of slot.nodes) retain(node, slot);
  } else if (isReactive(children)) {
    const slot = new State(parent, marker, children);
    bind(slot);
    if (slot.q != 3) for (const node of slot.nodes) retain(node, slot);
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
 * Inserts a child where the template left its parent empty, so there is no
 * marker and nothing to keep: a plain value becomes text, a state's text
 * value is written with `textContent`, and anything else falls back to
 * {@link append}.
 */
export function text(parent: Node, value: unknown) {
  if (isReactive(value)) {
    if (isTextValue(peek(value))) {
      bind(new Value(parent, value));
    } else {
      append(parent, value);
    }
  } else if (
    value instanceof Node ||
    Array.isArray(value) ||
    typeof value === "function"
  ) {
    append(parent, value);
  } else {
    parent.textContent = toText(value);
  }
}

/** Whether `value` renders as text. */
function isTextValue(value: unknown) {
  return (
    value === null || (typeof value !== "object" && typeof value !== "function")
  );
}

/**
 * A class set from `source` being `key` plus a text child, in one binding:
 * one object, one run and one subscription for both, so rows with a selected
 * class and a state label skip a binding each. The class is tracked on that
 * key only, like {@link State.is}, and written only when it changes.
 */
export function fused(
  element: Element,
  source: unknown,
  key: unknown,
  yes: string,
  no: string,
  parent: Node,
  label: unknown,
) {
  bind(new Fused(element, source, key, yes, no, parent, label), element);
}

class Fused extends Binding {
  private cls: string | null = null;
  private node: ChildNode | null = null;
  private full = false;

  constructor(
    readonly el: Element,
    readonly source: unknown,
    readonly k: unknown,
    readonly y: string,
    readonly no: string,
    readonly parent: Node,
    readonly label: unknown,
  ) {
    super();
  }

  f() {
    const source = this.source as any;
    const cls = (
      isReactive(source) ? is(source, this.k) : source.value === this.k
    )
      ? this.y
      : this.no;
    if (cls !== this.cls) {
      if (cls || this.el.hasAttribute("class"))
        this.el.setAttribute("class", cls);
      this.cls = cls;
    }
    if (this.full) return;

    const value = read(this.label);

    if (isTextValue(value)) {
      const text = toText(value);
      const node = this.node;

      if (node && node.parentNode === this.parent) (node as Text).data = text;
      else {
        this.parent.textContent = text;
        this.node = this.parent.firstChild;
      }
      return;
    }

    this.full = true;
    this.node = null;
    const parent = this.parent;
    parent.textContent = "";
    const slot = new State(parent, null, this.label);
    bind(slot);
    for (const node of slot.nodes) retain(node, slot);
  }
}

/**
 * A state child that is text now: writes its value with `textContent`, the
 * way a property would, and hands over to a full slot if it ever renders
 * nodes.
 */
class Value extends Binding {
  private node: ChildNode | null = null;

  constructor(
    private parent: Node,
    readonly g: unknown,
  ) {
    super();
  }

  f() {
    const value = read(this.g);

    if (isTextValue(value)) {
      const text = toText(value);
      const node = this.node;

      if (node && node.parentNode === this.parent) (node as Text).data = text;
      else {
        this.parent.textContent = text;
        this.node = this.parent.firstChild;
      }
      return;
    }

    const parent = this.parent;
    dispose(this);
    parent.textContent = "";
    const slot = new State(parent, null, this.g);
    bind(slot);
    for (const node of slot.nodes) retain(node, slot);
  }
}

/**
 * A state child: renders its value, again whenever it changes. Owned like
 * any binding, so a parent that disposes (a row, a derive) unlinks it
 * eagerly, and one without a parent is left to the collector.
 */
class State extends Binding implements Slot {
  nodes!: ChildNode[];

  constructor(
    private parent: Node | null,
    private marker: Node | null | undefined,
    readonly g: unknown,
  ) {
    super();
  }

  f() {
    const value = read(this.g);
    if (this.nodes) return update(this, 0, value);
    this.nodes = render(value);
    place(this.parent!, this, this.marker);
    this.parent = this.marker = null;
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
    const kids = value.childNodes;
    for (let i = 0; i < kids.length; i++) nodes.push(kids[i]);
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
