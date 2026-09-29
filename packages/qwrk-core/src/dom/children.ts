import {
  bind,
  Binding,
  dispose,
  is,
  isReactive,
  own,
  peek,
  retain,
  type State,
} from "#qwrk/reactivity/state.js";

/**
 * Inserts JSX children into `parent`, before `marker` or at the end, one at a
 * time, so any number of them fits. Nested arrays are flattened, and states
 * and functions become nodes that update in place: a function is called
 * again whenever a state it reads changes.
 */
export function append(parent: Node, children: unknown, marker?: Node | null) {
  if (Array.isArray(children)) {
    for (const child of children) append(parent, child, marker);
  } else if (typeof children === "function" || isReactive(children)) {
    const slot = new Slot(parent, marker, children);
    bind(slot);
    if (slot.q != 3) for (const node of slot.l) retain(node, slot);
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
      bind(new Label(null, null, null, "", "", parent, value));
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
  bind(new Label(element, source, key, yes, no, parent, label), element);
}

/**
 * A text child, written in place while it is text, and, with an element, the
 * class that element gets from whether `b` is `k`. Once the text renders
 * nodes, a {@link Slot} owned by the same owner takes it over.
 */
class Label extends Binding {
  /** The class written last. */
  u: string | null = null;
  /** The text node it writes, or `undefined` once a slot took the text over. */
  t: ChildNode | null | undefined = null;

  constructor(
    /** The element whose class it sets, or `null` for text only. */
    readonly a: Element | null,
    /** The state compared to `k`. */
    readonly b: unknown,
    readonly k: unknown,
    /** The class when `b` is `k`. */
    readonly y: string,
    /** The class otherwise. */
    readonly x: string,
    /** The element whose text it writes. */
    readonly h: Node,
    /** The text: a state, or a plain value. */
    readonly g: unknown,
  ) {
    super();
  }

  f() {
    const element = this.a;

    if (element) {
      const source = this.b as any;
      const cls = (
        isReactive(source) ? is(source, this.k) : source.value === this.k
      )
        ? this.y
        : this.x;
      if (cls !== this.u) {
        if (cls || element.hasAttribute("class")) {
          element.setAttribute("class", cls);
        }
        this.u = cls;
      }
    }
    if (this.t === undefined) return;

    const value = read(this.g);
    const parent = this.h;

    if (isTextValue(value)) {
      const text = toText(value);
      const node = this.t;

      if (node && node.parentNode === parent) (node as Text).data = text;
      else {
        const first = parent.firstChild;
        if (first && first === parent.lastChild && first.nodeType === 3) {
          (first as Text).data = text;
          this.t = first;
        } else {
          parent.textContent = text;
          this.t = parent.firstChild;
        }
      }
      return;
    }

    const owner = this.p;
    this.t = undefined;
    if (!element) dispose(this);
    parent.textContent = "";
    own(owner, () => append(parent, this.g));
  }
}

/**
 * A state or a function child: renders its value, or what the function
 * returns, again whenever a state it read changes. Owned like any binding,
 * so a parent that disposes (a row, a derive) unlinks it eagerly, and one
 * without a parent is left to the collector.
 */
class Slot extends Binding {
  /** The nodes it renders as, which keep it alive. */
  l!: ChildNode[];

  constructor(
    /** Where it inserts its first nodes, cleared once they are in. */
    private h: Node | null,
    private m: Node | null | undefined,
    /** A state, or a function. */
    readonly g: unknown,
  ) {
    super();
  }

  f() {
    const g = this.g;
    const value =
      typeof g === "function" ? read(g()) : (g as State<unknown>).value;
    if (this.l) return update(this, value);
    this.l = render(value);
    for (const node of this.l) this.h!.insertBefore(node, this.m ?? null);
    this.h = this.m = null;
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
  const nodes = collect(value, []);
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
 * Text updates reuse the same node; anything else replaces the nodes, each of
 * which keeps the slot alive. When its first and last nodes are still in
 * place, everything between them goes too, such as the rows a list added
 * since.
 */
function update(slot: Slot, value: unknown) {
  const nodes = slot.l;
  const first = nodes[0];
  const last = nodes[nodes.length - 1];

  if (first === last && first instanceof Text && isTextValue(value)) {
    first.data = toText(value);
    return;
  }

  const anchor = document.createTextNode("");
  const group = document.createDocumentFragment();
  first.before(anchor);
  if (last.parentNode === anchor.parentNode) relocate(first, last);
  else nodes.forEach((node) => node.remove());
  slot.l = render(value);
  for (const node of slot.l) {
    retain(node, slot);
    group.appendChild(node);
  }
  anchor.replaceWith(group);
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
