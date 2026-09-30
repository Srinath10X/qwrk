import { readFileSync } from "node:fs";
import { compile } from "./compile.js";

export { compile };

/** Modules the plugin compiles: JSX and TSX, and JavaScript that may hold JSX. */
const FILES = /\.(?:[jt]sx|[cm]?js)$/;

/** Imports that don't load a module's code, such as `?raw` or `?url`. */
const QUERIES = /(?:^|&)(?:raw|url|inline|worker|sharedworker)(?:&|=|$)/;

/**
 * Vite plugin that compiles JSX into template clones with fine-grained DOM
 * bindings: an expression in JSX that reads a state's `.value` updates the DOM
 * when it changes, without `derive()`.
 *
 * It also points Vite's own JSX transform (oxc on Vite 8+, esbuild before) at
 * qwrk's automatic runtime, for anything the compiler leaves untouched.
 *
 * An SVG file imports as a component that renders it inline:
 * `import Icon from "./icon.svg"`. With an asset query (`?url`, `?raw`) it
 * stays a URL, as Vite handles it.
 */
export default function qwrk() {
  return {
    name: "qwrk",
    enforce: "pre" as const,

    config(this: { meta?: { rolldownVersion?: string } }) {
      if (this?.meta?.rolldownVersion) {
        return {
          oxc: { jsx: { runtime: "automatic" as const, importSource: "qwrk" } },
        };
      }

      return {
        esbuild: { jsx: "automatic" as const, jsxImportSource: "qwrk" },
      };
    },

    transform(code: string, id: string) {
      const [file, query = ""] = id.split("?", 2);
      if (!FILES.test(file) || QUERIES.test(query) || file.startsWith("\0")) {
        return null;
      }
      if (
        !/x$/.test(file) &&
        (file.includes("/node_modules/") || !code.includes("<"))
      ) {
        return null;
      }
      return compile(code, file);
    },

    load(id: string) {
      const [file, query = ""] = id.split("?", 2);
      if (!file.endsWith(".svg") || QUERIES.test(query)) return null;
      let source: string;
      try {
        source = readFileSync(file, "utf8");
      } catch {
        return null;
      }
      const markup = source
        .replace(/<\?xml[^?]*\?>\s*/g, "")
        .replace(/<!DOCTYPE[^>]*>\s*/g, "")
        .replace(/^\s*(?:<!--[\s\S]*?-->\s*)*/, "")
        .replace(/\\/g, "\\\\")
        .replace(/`/g, "\\`")
        .replace(/\$\{/g, "\\${");
      const fragment = !/^\s*<svg[\s>]/i.test(markup);
      return {
        code: [
          `import { template as _$template } from "qwrk/internal";`,
          `const _tmpl$ = _$template(\`${markup}\`, ${fragment}, true);`,
          `/** An SVG file as a component: \`props\` land on its root. */`,
          `export default function Svg(props = {}) {`,
          `  const el = _tmpl$();`,
          `  for (const name in props) {`,
          `    const value = props[name];`,
          `    if (value != null) el.setAttribute(name === "className" ? "class" : name, value);`,
          `  }`,
          `  return el;`,
          `}`,
        ].join("\n"),
        map: null,
      };
    },
  };
}
