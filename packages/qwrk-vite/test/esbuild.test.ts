// @vitest-environment happy-dom
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { expect, it } from "vitest";
import qwrk from "../dist/esbuild.js";

const core = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../qwrk-core/dist/",
);

/** Resolves `qwrk` and its subpaths to the local build. */
const local = {
  name: "local-qwrk",
  setup(build: any) {
    build.onResolve(
      { filter: /^qwrk(\/.*)?$/ },
      ({ path }: { path: string }) => ({
        path: `${core}${
          path === "qwrk"
            ? "index.js"
            : path === "qwrk/internal"
              ? "internal.js"
              : "jsx/runtime.js"
        }`,
      }),
    );
  },
};

it("compiles JSX with the esbuild plugin", async () => {
  const dir = mkdtempSync(join(tmpdir(), "qwrk-esbuild-"));
  writeFileSync(
    join(dir, "counter.tsx"),
    `import { state } from "qwrk";
    export function Counter({ start }: { start: number }) {
      const count = state<number>(start);
      return <button onClick={() => count.value++}>count is {count.value * 1}</button>;
    }`,
  );
  writeFileSync(
    join(dir, "main.jsx"),
    `import { Counter } from "./counter.tsx";
    document.body.append(<main><Counter start={1} /></main>);`,
  );

  const result = await build({
    entryPoints: [join(dir, "main.jsx")],
    bundle: true,
    write: false,
    format: "iife",
    sourcemap: "inline",
    plugins: [qwrk(), local],
  });
  rmSync(dir, { recursive: true });
  const code = result.outputFiles[0].text;
  expect(code).not.toContain("jsx(");
  expect(code).toContain("counter.tsx");

  new Function(code)();
  const button = document.querySelector("button")!;
  button.click();
  expect(button.textContent).toBe("count is 2");
});
