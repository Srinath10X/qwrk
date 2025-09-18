#!/usr/bin/env node

import path from "path";
import fs from "fs-extra";
import inquirer from "inquirer";
import { fileURLToPath } from "url";
import { TITLE, INTRO } from "./const.js";

process.on("SIGINT", () => {
  process.exit(0);
});

const args = process.argv.slice(2);

let inputPath = args[0];
let projectName = inputPath || "qwrk-app";

process.stdout.write(TITLE);
process.stdout.write(INTRO);

if (!inputPath) {
  const { project_name } = await inquirer.prompt({
    name: "project_name",
    type: "input",
    message: "What is your project name?",
    default: "qwrk-app",
  });

  projectName = project_name;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const targetDir = path.resolve(process.cwd(), projectName);
const templateDir = path.join(__dirname, "../templates/qwrk-js");

if (fs.existsSync(targetDir)) {
  const { overwrite } = await inquirer.prompt({
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
Next Steps:
  cd ${projectName}
  npm install
  npm run dev
`);
