#!/usr/bin/env node

import path from "path";
import fs from "fs-extra";
import inquirer from "inquirer";
import { fileURLToPath } from "url";

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

/**
 * Exits cleanly when the user cancels with Ctrl+C.
 */
async function ask<T extends object>(
  question: Parameters<typeof inquirer.prompt>[0],
): Promise<T> {
  try {
    return (await inquirer.prompt(question)) as T;
  } catch (err) {
    if ((err as Error)?.name === "ExitPromptError") cancel(0);
    throw err;
  }
}

function cancel(code: number): never {
  process.stdout.write("❌ Operation cancelled.\n");
  process.exit(code);
}

process.stdout.write(TITLE);
process.stdout.write(INTRO);

let projectName = process.argv[2];

if (!projectName) {
  ({ projectName } = await ask<{ projectName: string }>({
    name: "projectName",
    type: "input",
    message: "What is your project name?",
    default: "qwrk-app",
  }));
}

const { template } = await ask<{ template: string }>({
  name: "template",
  type: "select",
  message: "Select a variant:",
  choices: [
    { name: "JavaScript", value: "qwrk-js" },
    { name: "TypeScript", value: "qwrk-ts" },
  ],
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const targetDir = path.resolve(process.cwd(), projectName);
const templateDir = path.join(__dirname, "../templates", template);

if (fs.existsSync(targetDir)) {
  const { overwrite } = await ask<{ overwrite: boolean }>({
    name: "overwrite",
    type: "confirm",
    message: `Directory "${projectName}" already exists. Overwrite?`,
    default: false,
  });

  if (!overwrite) cancel(1);

  await fs.remove(targetDir);
}

await fs.copy(templateDir, targetDir);
// npm drops `.gitignore` from published packages, so templates ship `_gitignore`.
await fs.move(
  path.join(targetDir, "_gitignore"),
  path.join(targetDir, ".gitignore"),
);

process.stdout.write(`✅ Project created at ${targetDir}\n`);

process.stdout.write(`
Next steps:
  cd ${projectName}
  npm install
  npm run dev
`);
