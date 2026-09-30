import {
  bind,
  dispose,
  is,
  isReactive,
  NONE,
  own,
  peek,
  retain,
  track,
  type Computation,
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
    const slot = createSlot(parent, marker, children);
    bind(slot);
    if (slot.q != 3) for (const node of slot.l!) retain(node, slot);
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
  if (isReactive(value) && isTextValue(peek(value))) {
    bind(createLabel(parent, value, null));
  } else if (isTextValue(value)) {
    parent.textContent = toText(value);
  } else {
    append(parent, value);
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
 *
 * The compiled template leaves a text node in `parent` for the label, taken
 * here rather than in its runs: they then never check `parent`, whose
 * delegated handlers give it a shape V8 drops once the rows are cleared,
 * along with the optimized code that checked it.
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
  bind(
    createLabel(
      parent,
      label,
      parent.firstChild,
      element,
      source,
      key,
      yes,
      no,
    ),
    element,
  );
}

/**
 * A text child, written in place while it is text, and, with an element, the
 * class that element gets from whether `b` is `k`. Once the text renders
 * nodes, a {@link Slot} owned by the same owner takes it over.
 */
interface Label extends Computation {
  /** The element whose class it sets, if any: text only without. */
  a?: Element;
  /** The state compared to `k`. */
  b: unknown;
  k: unknown;
  /** The class when `b` is `k`. */
  y?: string;
  /** The class otherwise. */
  x?: string;
  /** The element whose text it writes. */
  h: Node;
  /** The text: a state, or a plain value. */
  g: unknown;
  /** The class written last. */
  u: string | null;
  /** The text node it writes, or `undefined` once a slot took the text over. */
  t: ChildNode | null | undefined;
}

/**
 * Creates a {@link Label}. It is made per row, so it is an object literal
 * with all of its fields, not a class instance, see `Key`.
 */
function createLabel(
  h: Node,
  g: unknown,
  t: ChildNode | null,
  a?: Element,
  b?: unknown,
  k?: unknown,
  y?: string,
  x?: string,
): Label {
  return {
    s: NONE,
    p: null,
    q: 0,
    c: undefined,
    n: undefined,
    f: updateLabel,
    a,
    b,
    k,
    y,
    x,
    h,
    g,
    u: null,
    t,
  };
}

/**
 * Updates a {@link Label}. Once it read a state `b`, through its key, and a
 * state `g`, those are its two dependencies, in that order: only the half
 * whose version moved runs again, and the other one is only read again.
 */
function updateLabel(this: Label) {
  const { a: element, b: source, s } = this;
  const split = s.length == 6 && isReactive(source);

  if (element) {
    if (split && s[1] === s[0].v) {
      track(s[0]);
    } else {
      const cls = (
        isReactive(source)
          ? is(source, this.k)
          : (source as any).value === this.k
      )
        ? this.y!
        : this.x!;
      if (cls !== this.u) {
        if (cls || element.hasAttribute("class")) {
          element.setAttribute("class", cls);
        }
        this.u = cls;
      }
    }
  }
  if (this.t === undefined) return;
  if (split && s[4] === s[3].v) return track(s[3]);

  const value = read(this.g);
  const parent = this.h;

  if (isTextValue(value)) {
    const text = toText(value);
    const node = this.t;

    if (node?.parentNode === parent) {
      (node as Text).data = text;
    } else {
      parent.textContent = text;
      this.t = parent.firstChild;
    }
    return;
  }

  const owner = this.p;
  this.t = undefined;
  if (!element) dispose(this);
  parent.textContent = "";
  own(owner, () => append(parent, this.g));
}

/**
 * A state or a function child: renders its value, or what the function
 * returns, again whenever a state it read changes. Owned like any binding,
 * so a parent that disposes (a row, a derive) unlinks it eagerly, and one
 * without a parent is left to the collector.
 *
 * Text updates reuse the same node; anything else replaces the nodes, each
 * of which keeps the slot alive. When its first and last nodes are still in
 * place, everything between them goes too, such as the rows a list added
 * since.
 */
interface Slot extends Computation {
  /** Where it inserts its nodes, cleared once they are in. */
  h: Node | null;
  m: Node | null | undefined;
  /** A state, or a function. */
  g: unknown;
  /** The nodes it renders as, which keep it alive. */
  l?: ChildNode[];
}

/** Creates a {@link Slot}, an object literal like a {@link Label}. */
function createSlot(h: Node, m: Node | null | undefined, g: unknown): Slot {
  return {
    s: NONE,
    p: null,
    q: 0,
    c: undefined,
    n: undefined,
    f: updateSlot,
    h,
    m,
    g,
    l: undefined,
  };
}

/** Updates a {@link Slot}. */
function updateSlot(this: Slot) {
  const g = this.g;
  const value = read(typeof g === "function" ? g() : g);
  const nodes = this.l;

  if (nodes) {
    const first = nodes[0];
    const last = nodes[nodes.length - 1];

    if (first === last && first instanceof Text && isTextValue(value)) {
      first.data = toText(value);
      return;
    }

    first.before((this.m = blank()));
    this.h = this.m.parentNode;
    if (last.parentNode === this.h) relocate(first, last);
    else nodes.forEach((node) => node.remove());
  }

  for (const node of (this.l = render(value))) {
    if (nodes) retain(node, this);
    this.h?.insertBefore(node, this.m ?? null);
  }
  if (nodes) (this.m as ChildNode).remove();
  this.h = this.m = null;
}

/** The value of a state, read so the running computation tracks it, or `value`. */
export function read(value: unknown) {
  return isReactive(value) ? value.value : value;
}

/**
 * `false`, `true`, `null` and `undefined` render as empty text. Numbers other
 * than zero go to the DOM as they are, which writes the same text without
 * growing the engine's number-to-string cache for good, as a list of ids
 * would. Some DOM implementations write nothing for a raw `0`.
 */
function toText(value: unknown): string {
  return value == null || typeof value === "boolean"
    ? ""
    : typeof value === "number" && value
      ? (value as unknown as string)
      : String(value);
}

function toNode(value: unknown): ChildNode {
  return value instanceof Node ? (value as ChildNode) : blank(toText(value));
}

/** A new text node, empty by default, such as a marker. */
export function blank(text = "") {
  return document.createTextNode(text);
}

/** A new, empty `DocumentFragment`. */
export function fragment() {
  return document.createDocumentFragment();
}

/**
 * Renders a state's value: a primitive, a node, a fragment or an array of
 * them. Always returns at least one node, so the next update has a position.
 */
function render(value: unknown): ChildNode[] {
  const nodes = collect(value, []);
  return nodes.length ? nodes : [blank()];
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
    const group = fragment();
    append(group, ["", value, ""]);
    collect(group, nodes);
  } else {
    nodes.push(toNode(value));
  }
  return nodes;
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
