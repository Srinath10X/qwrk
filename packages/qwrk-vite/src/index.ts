/**
 * Vite plugin that compiles JSX with qwrk's automatic runtime (`qwrk/jsx-runtime`).
 *
 * Vite 8+ transforms JSX with oxc, older versions with esbuild.
 */
export default function qwrk() {
  return {
    name: "qwrk",
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
  };
}
