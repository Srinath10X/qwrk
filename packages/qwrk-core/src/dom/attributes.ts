import { isReactive } from "#/reactivity/state.js";

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
    value.effect((next) => setAttribute(element, name, next));
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
  } else if (value == null || value === false) {
    element.removeAttribute(name);
  } else {
    element.setAttribute(name, value === true ? "" : String(value));
  }
}

function toText(value: unknown) {
  return value == null ? "" : String(value);
}

