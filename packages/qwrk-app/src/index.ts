#!/usr/bin/env node

import path from "path";
import fs from "fs-extra";
import inquirer from "inquirer";
import { fileURLToPath } from "url";

process.on("SIGINT", () => {
  process.exit(0);
});

export const TITLE = `
   ____                   __  
  / __ \\ _      __ _____ / /__
 / / / /| | /| / // ___// //_/
/ /_/ / | |/ |/ // /   / ,<   
\\___\\_\\ |__/|__//_/   /_/|_|\n
`;

export const INTRO = `
⚡ Setting up your Qwrkspace...\n
`;

const args: string[] = process.argv.slice(2);

let inputPath = args[0];
let projectName = inputPath || "qwrk-app";

process.stdout.write(TITLE);
process.stdout.write(INTRO);

if (!inputPath) {
  try {
    const { project_name } = await inquirer.prompt<{
      project_name: string;
    }>({
      name: "project_name",
      type: "input",
      message: "What is your project name?",
      default: "qwrk-app",
    });

    projectName = project_name;
  } catch (err: unknown) {
    if (
      err &&
      typeof err === "object" &&
      (err as any).name === "ExitPromptError"
    ) {
      process.stdout.write("❌ Operation cancelled.\n");
      process.exit(0);
    }

    throw err;
  }
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const targetDir = path.resolve(process.cwd(), projectName);
const templateDir = path.join(__dirname, "../templates/qwrk-js");

if (fs.existsSync(targetDir)) {
  const { overwrite } = await inquirer.prompt<{
    overwrite: boolean;
  }>({
    name: "overwrite",
    type: "confirm",
    message: `Directory "${projectName}" already exists. Overwrite?`,
    default: false,
  });

  if (!overwrite) {
    process.stdout.write("❌ Operation cancelled.\n");
    process.exit(1);
  }

  await fs.remove(targetDir);
}

await fs.copy(templateDir, targetDir);

process.stdout.write(`✅ Project created at ${targetDir}\n`);

process.stdout.write(`
Next steps:
  cd ${projectName}
  npm install
  npm run dev
`);
