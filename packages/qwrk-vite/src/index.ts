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
  };
}
