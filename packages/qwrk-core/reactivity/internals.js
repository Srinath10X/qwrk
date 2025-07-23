import { isReactive, instanceOf, isHTMLelement } from "../core/utils.js";

export const setAttributes = (element, key, value) => {
  if (isReactive(value)) {
    element.setAttribute(key, value.value);
    value.effect((newValue) => element.setAttribute(key, newValue));
  } else {
    element.setAttribute(key, value);
  }
};

const createStatelessElement = (object) =>
  isHTMLelement(object) || instanceOf(object, Text)
    ? object
    : document.createTextNode(object);

const createStatefullElement = (object) => {
  const element = createStatelessElement(object.value);
  object.effect((newValue) =>
    isHTMLelement(newValue)
      ? element.replaceWith(newValue)
      : (element.nodeValue = newValue),
  );
  return element;
};

export const _processedChildren = (children) =>
  [children]
    .flat(Infinity)
    .map((child) =>
      isReactive(child)
        ? createStatefullElement(child)
        : createStatelessElement(child),
    );
