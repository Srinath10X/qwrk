import { fileURLToPath } from "node:url";
import { Window } from "happy-dom";
import { build, type Rollup } from "vite";
import { describe, expect, it } from "vitest";
import qwrk from "../dist/index.js";

const core = fileURLToPath(new URL("../../qwrk-core/dist/", import.meta.url));
const templates = fileURLToPath(
  new URL("../../../templates/", import.meta.url),
);

/** Builds a Vite app with the plugin, resolving `qwrk` to the local build. */
async function bundle(root: string) {
  const result = (await build({
    root,
    configFile: false,
    logLevel: "silent",
    plugins: [qwrk()],
    resolve: {
      alias: [
        {
          find: /^qwrk\/jsx-(dev-)?runtime$/,
          replacement: `${core}jsx/runtime.js`,
        },
        { find: /^qwrk\/internal$/, replacement: `${core}internal.js` },
        { find: /^qwrk$/, replacement: `${core}index.js` },
      ],
    },
    build: { write: false, minify: false, modulePreload: false },
  })) as Rollup.RollupOutput;

  return result.output.find(
    (file): file is Rollup.OutputChunk => file.type === "chunk" && file.isEntry,
  )!.code;
}

/** Runs bundled app code against a fresh happy-dom page. */
function run(code: string) {
  const window = new Window();
  Object.assign(globalThis, {
    document: window.document,
    Node: window.Node,
    Text: window.Text,
    DocumentFragment: window.DocumentFragment,
  });
  window.document.body.innerHTML = '<div id="root"></div>';
  new Function(code)();
  return window.document;
}

describe("qwrk-vite", () => {
  it("uses oxc on Vite 8 and esbuild before it", () => {
    const plugin = qwrk();
    expect(plugin.enforce).toBe("pre");

    expect(plugin.config.call({ meta: { rolldownVersion: "1.0.0" } })).toEqual({
      oxc: { jsx: { runtime: "automatic", importSource: "qwrk" } },
    });
    expect(plugin.config.call({ meta: {} })).toEqual({
      esbuild: { jsx: "automatic", jsxImportSource: "qwrk" },
    });
  });

  it("compiles JSX modules and skips the rest", () => {
    const { transform } = qwrk();

    expect(
      transform("export const a = <p>{b}</p>;", "/src/a.jsx")!.code,
    ).toContain("_$text(");
    expect(
      transform("export const a = <p />;", "/src/a.tsx?v=1"),
    ).not.toBeNull();
    expect(transform("export const a = <p />;", "/src/a.jsx?raw")).toBeNull();
    expect(transform("export const a = 1;", "/src/a.ts")).toBeNull();
    expect(
      transform("export const a = <p />;", "/node_modules/x/a.js"),
    ).toBeNull();
    expect(transform("a { color: red }", "/src/a.css")).toBeNull();
  });

  it("loads SVG files as components", () => {
    const { load } = qwrk();
    const icon = fileURLToPath(new URL("./svg-app/icon.svg", import.meta.url));

    const component = load(icon) as { code: string };
    expect(component.code).toContain('from "qwrk/internal"');
    expect(component.code).toContain("export default function Svg");
    expect(component.code).toContain('viewBox="0 0 24 24"');
    expect(component.code).toContain("setAttribute");

    expect(load(`${icon}?url`)).toBeNull();
    expect(load(`${icon}?raw`)).toBeNull();
    expect(load("/src/a.jsx")).toBeNull();
  });

  it("builds and runs an app importing an SVG component", async () => {
    const code = await bundle(
      fileURLToPath(new URL("./svg-app/", import.meta.url)),
    );
    const document = run(code);
    const svg = document.querySelector("svg")!;
    expect(svg.namespaceURI).toBe("http://www.w3.org/2000/svg");
    expect(svg.getAttribute("class")).toBe("big");
    expect(svg.getAttribute("viewBox")).toBe("0 0 24 24");
    expect(svg.querySelector("path")!.getAttribute("d")).toBe("M12 2v20");
  });

  it.each(["qwrk-js", "qwrk-ts"])(
    "builds and runs the %s template",
    async (template) => {
      const code = await bundle(templates + template);
      expect(code).not.toContain("jsx(");
      expect(code).toContain("cloneNode");
      const document = run(code);
      const button = document.querySelector("button")!;
      expect(button.textContent).toBe("count is 0");

      button.click();
      button.click();
      expect(button.textContent).toBe("count is 2");
      expect(document.querySelector("h1")!.textContent).toBe("Vite + Qwrk");
    },
  );
});
