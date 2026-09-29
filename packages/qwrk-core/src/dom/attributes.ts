import { read } from "#qwrk/dom/children.js";
import {
  bind,
  Binding,
  is,
  isReactive,
  peek,
  watch,
} from "#qwrk/reactivity/state.js";

const ALIASES: Record<string, string> = { className: "class", htmlFor: "for" };

/**
 * Set as properties: the attributes only hold the initial value, so they stop
 * updating the input once the user edits it.
 */
const PROPERTIES = new Set(["value", "checked", "selected"]);

/**
 * Sets an attribute from a JSX prop, keeping it in sync when the value is a
 * state, or a function, called again whenever a state it reads changes.
 *
 * `className`/`htmlFor` map to `class`/`for`.
 */
export function bindAttribute(element: Element, key: string, value: unknown) {
  bindWith(element, ALIASES[key] ?? key, value, setAttribute);
}

/**
 * {@link bindAttribute} for a name that is neither an alias, a property nor
 * `style`. Compiled JSX calls it for those, since it knows the name, so apps
 * that never bind a style or a property don't ship them.
 */
export function attribute(element: Element, name: string, value: unknown) {
  bindWith(element, name, value, setPlain);
}

/** Writes an attribute's value to the element. */
type Setter = (element: Element, name: string, value: unknown) => void;

function bindWith(element: Element, name: string, value: unknown, set: Setter) {
  if (typeof value === "function") {
    bind(new Attribute(element, name, value as () => unknown, set), element);
  } else if (isReactive(value)) {
    set(element, name, peek(value));
    watch(value, element, set, name);
  } else {
    set(element, name, value);
  }
}

/** An attribute set from a function, again whenever a state it read changes. */
class Attribute extends Binding {
  constructor(
    readonly a: Element,
    readonly b: string,
    readonly g: () => unknown,
    readonly h: Setter,
  ) {
    super();
  }

  f() {
    this.h(this.a, this.b, read(this.g()));
  }
}

/**
 * Sets `class` from whether a state is `key`, so only the elements of the
 * two keys re-run, see {@link State.is}. Compiled JSX calls it for
 * `class={a.value === b ? "yes" : "no"}`.
 */
export function classIf(
  element: Element,
  source: unknown,
  key: unknown,
  yes: string,
  no: string,
) {
  bind(new ClassIf(element, source, key, yes, no), element);
}

/** A class set from `source` being `key`, tracked on that key only. */
class ClassIf extends Binding {
  constructor(
    readonly a: Element,
    readonly source: unknown,
    readonly k: unknown,
    readonly y: string,
    readonly no: string,
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
    if (cls || this.a.hasAttribute("class")) this.a.setAttribute("class", cls);
  }
}

/** Sets a property, a style object, or else an attribute, see {@link setPlain}. */
function setAttribute(element: Element, name: string, value: unknown) {
  if (PROPERTIES.has(name) && name in element) {
    (element as any)[name] = name === "value" ? toText(value) : !!value;
  } else if (name === "style" && typeof value === "object" && value) {
    setStyle(element as HTMLElement, value as Record<string, unknown>);
  } else {
    setPlain(element, name, value);
  }
}

/**
 * `true` sets an empty attribute, `false`/`null`/`undefined` remove it.
 * Writing `""` to a `class` that isn't there changes nothing observable
 * (unlike boolean attributes like `hidden`, where presence is the value),
 * so it is skipped: most elements never grow the classes they don't use.
 */
function setPlain(element: Element, name: string, value: unknown) {
  if (value == null || value === false) {
    element.removeAttribute(name);
  } else {
    const text = value === true ? "" : String(value);
    if (text || name !== "class" || element.hasAttribute(name)) {
      element.setAttribute(name, text);
    }
  }
}

function toText(value: unknown) {
  return value == null ? "" : String(value);
}

/**
 * Replaces the inline style with `styles`. Keys are camelCase
 * (`backgroundColor`), kebab-case or custom properties (`--gap`). Numbers get
 * `px` when CSS rejects them without a unit: `width: 16` but `opacity: 0.5`.
 */
function setStyle(element: HTMLElement, styles: Record<string, unknown>) {
  element.removeAttribute("style");

  for (const [key, value] of Object.entries(styles)) {
    if (value == null || value === false) continue;
    const property = key.startsWith("--")
      ? key
      : key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
    element.style.setProperty(property, String(value));

    if (
      typeof value === "number" &&
      !element.style.getPropertyValue(property)
    ) {
      element.style.setProperty(property, `${value}px`);
    }
  }
}
