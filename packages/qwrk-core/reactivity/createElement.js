import { instanceOf, fragment } from "../core/utils.js";
import { setAttributes, _processedChildren } from "./internals.js";

export function createElement(tag, attributes, ...children) {
  if (tag === fragment) return _processedChildren(children);
  if (instanceOf(tag, Function)) return tag({ children, ...attributes });

  const element = document.createElement(tag);

  for (let key in attributes) {
    const value = attributes[key];
    key = key === "className" ? "class" : key.toLowerCase();
    key.substring(0, 2) == "on"
      ? element.addEventListener(key.slice(2), value)
      : setAttributes(element, key, value);
  }

  element.append(..._processedChildren(children));
  return element;
}
