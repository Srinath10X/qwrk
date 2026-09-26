import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it } from "vitest";

const cli = fileURLToPath(new URL("../dist/index.js", import.meta.url));
let cwd: string;

beforeEach(() => {
  cwd = fs.mkdtempSync(path.join(os.tmpdir(), "create-qwrk-app-"));
});

/** Runs the CLI without a terminal, as `pnpm create qwrk-app` would. */
function create(args: string[], agent = "pnpm/11.0.0 node/v24") {
  const result = spawnSync("node", [cli, ...args], {
    cwd,
    encoding: "utf8",
    env: { ...process.env, npm_config_user_agent: agent, NO_COLOR: "1" },
  });
  return { status: result.status, output: result.stdout + result.stderr };
}

const read = (file: string) => fs.readFileSync(path.join(cwd, file), "utf8");
const exists = (file: string) => fs.existsSync(path.join(cwd, file));

describe("create-qwrk-app", () => {
  it("creates a TypeScript project", () => {
    const { status, output } = create(["my-app", "-t", "ts", "--no-install"]);

    expect(status).toBe(0);
    expect(output).toContain("Created my-app");
    expect(exists("my-app/src/main.tsx")).toBe(true);
    expect(exists("my-app/tsconfig.json")).toBe(true);
    expect(read("my-app/src/main.tsx")).toContain("append(<App />)");
  });

  it("creates a JavaScript project", () => {
    const { status } = create(["my-app", "--template", "js", "--no-install"]);

    expect(status).toBe(0);
    expect(exists("my-app/src/main.jsx")).toBe(true);
    expect(exists("my-app/tsconfig.json")).toBe(false);
  });

  it("names the package after the project", () => {
    create(["My Todo App", "-t", "ts", "--no-install"]);

    expect(JSON.parse(read("My Todo App/package.json")).name).toBe(
      "my-todo-app",
    );
  });

  it("renames _gitignore to .gitignore", () => {
    create(["my-app", "-t", "js", "--no-install"]);

    expect(exists("my-app/.gitignore")).toBe(true);
    expect(exists("my-app/_gitignore")).toBe(false);
  });

  it.each([
    ["pnpm/11.0.0", "pnpm install", "pnpm dev"],
    ["yarn/4.0.0", "yarn install", "yarn dev"],
    ["bun/1.2.0", "bun install", "bun run dev"],
    ["npm/11.0.0", "npm install", "npm run dev"],
  ])("prints next steps for %s", (agent, install, dev) => {
    const { output } = create(["my-app", "-t", "ts", "--no-install"], agent);

    expect(output).toContain("cd my-app");
    expect(output).toContain(install);
    expect(output).toContain(dev);
  });

  it("rejects unknown templates", () => {
    const { status, output } = create(["my-app", "-t", "vue", "--no-install"]);

    expect(status).toBe(1);
    expect(output).toContain('Unknown template "vue"');
    expect(exists("my-app")).toBe(false);
  });
});
