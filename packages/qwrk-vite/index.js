export default function qwrk() {
  return {
    name: "qwrk",
    config() {
      return {
        esbuild: {
          jsx: "automatic",
          jsxImportSource: "qwrk",
        },
      };
    },
  };
}
