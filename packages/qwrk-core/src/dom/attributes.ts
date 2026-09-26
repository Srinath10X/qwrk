import { isReactive, watch } from "#/reactivity/state.js";

const ALIASES: Record<string, string> = { className: "class", htmlFor: "for" };

/**
 * Set as properties: the attributes only hold the initial value, so they stop
 * updating the input once the user edits it.
 */
const PROPERTIES = new Set(["value", "checked", "selected"]);

/**
 * Sets an attribute from a JSX prop, keeping it in sync when the value is a state.
 *
 * `className`/`htmlFor` map to `class`/`for`.
 */
export function bindAttribute(element: Element, key: string, value: unknown) {
  const name = ALIASES[key] ?? key;

  if (isReactive(value)) {
    setAttribute(element, name, value.value);
    watch(value, element, (owner, next) => setAttribute(owner, name, next));
  } else {
    setAttribute(element, name, value);
  }
}

/**
 * `true` sets an empty attribute, `false`/`null`/`undefined` remove it.
 */
function setAttribute(element: Element, name: string, value: unknown) {
  if (PROPERTIES.has(name) && name in element) {
    (element as any)[name] = name === "value" ? toText(value) : !!value;
  } else if (name === "style" && typeof value === "object" && value) {
    setStyle(element as HTMLElement, value as Record<string, unknown>);
  } else if (value == null || value === false) {
    element.removeAttribute(name);
  } else {
    element.setAttribute(name, value === true ? "" : String(value));
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
