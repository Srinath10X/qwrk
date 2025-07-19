declare module "qwrk" {
  interface Plugin {
    name: string;
    config?: () => {
      esbuild?: {
        jsxFactory?: string;
        jsxFragment?: string;
        jsxInject?: string;
      };
    };
  }

  export default function qwrk(): Plugin;
}
