/**
 * Vite plugin that compiles JSX with qwrk's automatic runtime (`qwrk/jsx-runtime`).
 */
export default function qwrk() {
  return {
    name: "qwrk",
    config() {
      return {
        esbuild: { jsx: "automatic" as const, jsxImportSource: "qwrk" },
      };
    },
  };
}
