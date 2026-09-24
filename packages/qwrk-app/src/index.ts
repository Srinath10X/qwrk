#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline/promises";

const TITLE = `
   ____                   __
  / __ \\ _      __ _____ / /__
 / / / /| | /| / // ___// //_/
/ /_/ / | |/ |/ // /   / ,<
\\___\\_\\ |__/|__//_/   /_/|_|\n
`;

const INTRO = `
⚡ Setting up your Qwrkspace...\n
`;

const TEMPLATES: Record<string, string> = { js: "qwrk-js", ts: "qwrk-ts" };

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { template: { type: "string", short: "t" } },
});

const rl = createInterface({ input: process.stdin, output: process.stdout });
rl.on("SIGINT", () => cancel(0));

function cancel(code: number): never {
  process.stdout.write("\n❌ Operation cancelled.\n");
  process.exit(code);
}

/**
 * Asks a question and returns the trimmed answer, or `fallback` when empty.
 * Exits cleanly when stdin closes (Ctrl+D).
 */
async function ask(question: string, fallback = "") {
  try {
    const answer = await rl.question(question);
    return answer.trim() || fallback;
  } catch {
    cancel(0);
  }
}

/**
 * Reads the package manager that launched us, e.g. `pnpm create qwrk-app`.
 */
function packageManager() {
  const agent = process.env.npm_config_user_agent ?? "";
  return ["pnpm", "yarn", "bun"].find((pm) => agent.startsWith(pm)) ?? "npm";
}

process.stdout.write(TITLE);
process.stdout.write(INTRO);

const projectName =
  positionals[0] ??
  (await ask("What is your project name? (qwrk-app) ", "qwrk-app"));

let template = TEMPLATES[values.template ?? ""];

while (!template) {
  const answer = await ask(
    "Select a variant:\n  1) JavaScript\n  2) TypeScript\n> (1) ",
    "1",
  );
  template = { 1: "qwrk-js", 2: "qwrk-ts" }[answer] ?? TEMPLATES[answer];
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const targetDir = path.resolve(process.cwd(), projectName);
const templateDir = path.join(__dirname, "../templates", template);

if (fs.existsSync(targetDir)) {
  const answer = await ask(
    `Directory "${projectName}" already exists. Overwrite? (y/N) `,
  );

  if (!/^y(es)?$/i.test(answer)) cancel(1);

  fs.rmSync(targetDir, { recursive: true, force: true });
}

rl.close();

fs.cpSync(templateDir, targetDir, { recursive: true });
// npm drops `.gitignore` from published packages, so templates ship `_gitignore`.
fs.renameSync(
  path.join(targetDir, "_gitignore"),
  path.join(targetDir, ".gitignore"),
);

const pm = packageManager();

process.stdout.write(`✅ Project created at ${targetDir}\n`);

process.stdout.write(`
Next steps:
  cd ${projectName}
  ${pm} install
  ${pm === "npm" || pm === "bun" ? `${pm} run dev` : `${pm} dev`}
`);
