import { isReactive } from "../core/utils.js";

/**
 * @name: effect
 * @description Executes a callback function when the dependencies change.
 *
 * @param {Function} callback - Callback function to execute.
 * @param {Array} deps - Array of dependencies to track and trigger the callback.
 */
export function effect(callback, deps = []) {
	deps.forEach((dep) => {
		if (isReactive(dep)) dep.effect(callback);
	});

	document.addEventListener("DOMContentLoaded", callback);
}
