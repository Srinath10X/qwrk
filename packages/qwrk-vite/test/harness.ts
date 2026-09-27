import { transformSync } from "esbuild";
import * as qwrk from "../../qwrk-core/dist/index.js";
import * as internal from "../../qwrk-core/dist/internal.js";
import * as runtime from "../../qwrk-core/dist/jsx/runtime.js";
import { compile } from "../dist/compile.js";

const modules: Record<string, object> = {
  qwrk,
  "qwrk/internal": internal,
  "qwrk/jsx-runtime": runtime,
};

/**
 * Evaluates an ES module that imports only qwrk, and returns its default
 * export.
 */
function evaluate(code: string) {
  const body = code
    .replace(
      /import\s*\{([^}]*)\}\s*from\s*"([^"]+)";?/g,
      (_, names: string, from: string) =>
        `const {${names.replace(/\sas\s/g, ": ")}} = modules[${JSON.stringify(from)}];`,
    )
    .replace(/export default /, "return ")
    .replace(/export\s*\{\s*(\w+) as default\s*\};?/, "return $1;");
  return new Function("modules", body)(modules);
}

/** Compiles a module with the qwrk compiler and evaluates it. */
export function compiled(source: string, id = "case.jsx") {
  const result = compile(source, id);
  if (!result) throw Error("nothing compiled");
  const code = id.endsWith(".tsx")
    ? transformSync(result.code, { loader: "tsx", format: "esm" }).code
    : result.code;
  return evaluate(code);
}

/** Compiles a module with esbuild's automatic JSX runtime and evaluates it. */
export function uncompiled(source: string, id = "case.jsx") {
  const { code } = transformSync(source, {
    loader: id.endsWith(".tsx") ? "tsx" : "jsx",
    jsx: "automatic",
    jsxImportSource: "qwrk",
    format: "esm",
  });
  return evaluate(code);
}

/**
 * Serializes a DOM tree so that trees that look the same compare equal:
 * attributes sorted, comments dropped, adjacent texts merged, and properties
 * that attributes don't show included.
 */
export function serialize(node: Node): string {
  if (node.nodeType === 3) return escapeText((node as Text).data);
  if (node.nodeType === 8) return "";
  if (node.nodeType === 11) return [...node.childNodes].map(serialize).join("");

  const element = node as Element;
  const svg =
    element.namespaceURI === "http://www.w3.org/2000/svg" ? "svg:" : "";
  const attributes = [...element.attributes]
    .map((a) => `${a.name}="${a.value}"`)
    .sort();
  const input = element as HTMLInputElement;
  if (element.tagName === "INPUT" || element.tagName === "TEXTAREA") {
    attributes.push(`.value="${input.value}"`);
    if (input.type === "checkbox") attributes.push(`.checked=${input.checked}`);
  }
  if (element.tagName === "SELECT") attributes.push(`.value="${input.value}"`);

  const inner = [...element.childNodes].map(serialize).join("");
  const tag = svg + element.localName;
  return `<${[tag, ...attributes].join(" ")}>${inner}</${tag}>`;
}

function escapeText(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;");
}

export const tick = () => new Promise((resolve) => setTimeout(resolve));

/** What a case module's default export returns. */
export interface Case {
  node: Node;
  steps?: ((node: ParentNode) => void)[];
}

/**
 * Runs a case module compiled and uncompiled, each in its own container in
 * the document, and returns the serialized DOM of both after mounting and
 * after each step.
 */
export async function both(
  source: string,
  runtimeSource = source,
  id?: string,
) {
  const runs = [];

  for (const load of [
    () => compiled(source, id),
    () => uncompiled(runtimeSource, id),
  ]) {
    const container = document.createElement("div");
    document.body.append(container);
    const { node, steps = [] }: Case = load()();
    container.append(node);
    await tick();
    const snapshots = [serialize(container)];

    for (const step of steps) {
      step(container);
      await tick();
      snapshots.push(serialize(container));
    }
    container.remove();
    runs.push(snapshots);
  }

  return { compiled: runs[0], uncompiled: runs[1] };
}
