import { instanceOf, fragment } from "../core/utils.js";
import { setAttributes, _processedChildren } from "./internals.js";

/**
 * @param {string | Function | any} tag
 * @param {Record<string, any>} attributes
 * @param {...any} children
 *
 * @returns {*}
 */
export function createElement(tag, attributes, ...children) {
  if (tag === fragment) return _processedChildren(children);
  if (instanceOf(tag, Function)) return tag({ children, ...attributes });

  const element = document.createElement(tag);

  for (let key in attributes) {
    const value = attributes[key];

    ///  TODO: Clean up this bullshit below

    switch (key) {
      case "className":
        key = "class";

      case "htmlFor":
        key = "for";
    }

    key = key.toLowerCase();

    key.substring(0, 2) == "on"
      ? element.addEventListener(key.slice(2), value)
      : setAttributes(element, key, value);
  }

  element.append(..._processedChildren(children));
  return element;
}
