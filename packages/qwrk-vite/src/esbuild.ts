import { readFile } from "node:fs/promises";
import { compile } from "./compile.js";

/** The parts of esbuild's plugin API this plugin uses. */
interface Build {
  initialOptions: { jsx?: string; jsxImportSource?: string };
  onLoad(
    options: { filter: RegExp },
    callback: (args: { path: string }) => Promise<{
      contents: string;
      loader: "jsx" | "tsx";
    }>,
  ): void;
}

/**
 * esbuild plugin that compiles `.jsx` and `.tsx` files with qwrk's JSX
 * compiler, like the Vite plugin. JSX the compiler leaves untouched goes to
 * qwrk's automatic runtime.
 *
 * @example
 * await esbuild.build({ entryPoints: ["src/main.jsx"], bundle: true, plugins: [qwrk()] });
 */
export default function qwrk() {
  return {
    name: "qwrk",

    setup(build: Build) {
      build.initialOptions.jsx ??= "automatic";
      build.initialOptions.jsxImportSource ??= "qwrk";

      build.onLoad({ filter: /\.[jt]sx$/ }, async ({ path }) => {
        const code = await readFile(path, "utf8");
        const result = compile(code, path);
        const loader = path.endsWith(".tsx") ? "tsx" : "jsx";
        if (!result) return { contents: code, loader };

        return {
          contents: `${result.code}\n//# sourceMappingURL=${result.map.toUrl()}`,
          loader,
        };
      });
    },
  };
}
