export default function qwrk() {
  return {
    name: "qwrk",
    config() {
      return {
        esbuild: {
          jsxFactory: "createElement",
          jsxFragment: "fragment",
          jsxInject: "import {createElement,fragment} from 'qwrk'",
        },
      };
    },
  };
}
