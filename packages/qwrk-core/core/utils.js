/**
 * A unique symbol used to represent a fragment node.
 *
 * @type {symbol}
 */
export const fragment = Symbol("fragment");
/**
 * Checks if a is an instance of b
 *
 * @param {any} a
 * @param {any} b
 * @returns {boolean}
 */
export const instanceOf = (a, b) => a instanceof b;

/**
 * Checks if an object is reactive
 *
 * @param {any} object
 * @returns {boolean}
 */
export const isReactive = (object) => object?.__MagicVariable__;

/**
 * Checks if an object is an HTMLElement
 *
 * @param {any} object
 * @returns {boolean}
 */
export const isHTMLelement = (object) => instanceOf(object, HTMLElement);
