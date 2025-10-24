export interface Plugin {
  name: string;
  config?: () => {
    esbuild?: {
      jsxFactory?: string;
      jsxFragment?: string;
      jsxInject?: string;
    };
  };
}

export default function qwrk(): Plugin {
  return {
    name: "qwrk",
    config() {
      return {
        esbuild: {
          jsxFactory: "createElement",
          jsxFragment: "fragment",
          jsxInject: "import { createElement, fragment } from 'qwrk'",
        },
      };
    },
  };
}
