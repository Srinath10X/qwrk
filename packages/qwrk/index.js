const instanceOf = (a, b) => a instanceof b;
const isReactive = (object) => object?.__reactiveVariable__;
const isHTMLelement = (object) => instanceOf(object, HTMLElement);

export const fragment = ({ children }) => children;

export const reactive = (value) => {
  const oldValue = value;
  const effects = new Set();

  return {
    __reactiveVariable__: true,

    get value() {
      return value;
    },

    set value(newValue) {
      value = newValue;
      this.react();
    },

    effect(fn) {
      effects.add(fn);
    },

    react() {
      effects.forEach((fn) => fn(value, oldValue));
    },
  };
};

const setAttributes = (element, key, value) => {
  if (isReactive(value)) {
    element.setAttribute(key, value.value);
    value.effect((newValue) => element.setAttribute(key, newValue));
  } else element.setAttribute(key, value);
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

const processedChildren = (children) =>
  [children]
    .flat(Infinity)
    .map((child) =>
      isReactive(child)
        ? createStatefullElement(child)
        : createStatelessElement(child),
    );

export const createElement = (tag, attributes, ...children) => {
  if (tag === fragment) return processedChildren(children);
  if (instanceOf(tag, Function)) return tag({ children, ...attributes });

  const element = document.createElement(tag);

  for (let key in attributes) {
    const value = attributes[key];
    key = key === "className" ? "class" : key.toLowerCase();
    key.substring(0, 2) == "on"
      ? element.addEventListener(key.slice(2), value)
      : setAttributes(element, key, value);
  }

  element.append(...processedChildren(children));
  return element;
};
