#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parseArgs, styleText } from "node:util";
import * as p from "@clack/prompts";

/** The docs logo (`docs/public/qwrk.svg`) rasterized to 26x22 pixels. */
const LOGO = `
........#######...........
......###########.........
....###############.......
...#################......
..######.......######.....
.######.........#####.....
.#####...........#####....
.####.............####....
####..............####....
####...............####...
####...............####...
####...............####...
####........##.....####...
#####........####.#####...
.####........#########....
.#####........########....
.######........######.....
..#######.....#######.....
...###################....
....###################...
......###########...####..
........#######.......###.
`
  .trim()
  .split("\n");

const { version } = JSON.parse(
  fs.readFileSync(new URL("../package.json", import.meta.url), "utf8"),
);

/**
 * Draws the logo with half-block characters, two pixel rows per line, in the
 * logo's diagonal gradient, with `Qwrk v<version>` centered below it. Falls
 * back to plain blocks without 24-bit color.
 */
function logo() {
  const truecolor = process.stdout.hasColors?.(2 ** 24) ?? false;
  const height = LOGO.length;
  const width = LOGO[0].length;

  function color(x: number, y: number, layer: 38 | 48) {
    const t = Math.max(0, (x / width + y / height) / 2 - 0.45) / 0.55;
    const [r, g, b] = [
      [0x89, 0x51],
      [0xb4, 0x6b],
      [0xfa, 0x94],
    ].map(([from, to]) => Math.round(from + (to - from) * t));
    return truecolor ? `\x1b[${layer};2;${r};${g};${b}m` : "";
  }

  const reset = truecolor ? "\x1b[0m" : "";
  const lines = [];

  for (let y = 0; y < height; y += 2) {
    let line = "";
    for (let x = 0; x < width; x++) {
      const top = LOGO[y][x] === "#";
      const bottom = LOGO[y + 1]?.[x] === "#";

      if (top && bottom) line += `${color(x, y, 38)}${color(x, y + 1, 48)}▀`;
      else if (top) line += `${color(x, y, 38)}▀`;
      else if (bottom) line += `${color(x, y + 1, 38)}▄`;
      else line += " ";
      line += reset;
    }
    lines.push(`  ${line}`);
  }

  const title = `Qwrk v${version}`;
  const indent = " ".repeat(2 + Math.floor((width - title.length) / 2));
  lines.push(
    "",
    `${indent}${styleText("bold", "Qwrk")} ${styleText("dim", `v${version}`)}`,
  );

  return lines.join("\n");
}

const TEMPLATES: Record<string, string> = { js: "qwrk-js", ts: "qwrk-ts" };

const { values, positionals } = parseArgs({
  allowPositionals: true,
  allowNegative: true,
  options: {
    template: { type: "string", short: "t" },
    install: { type: "boolean" },
  },
});

/**
 * Returns the prompt's answer, or exits cleanly when the user cancels (Ctrl+C).
 */
function answer<T>(value: T): Exclude<T, symbol> {
  if (p.isCancel(value)) {
    p.cancel("Operation cancelled.");
    process.exit(0);
  }
  return value as Exclude<T, symbol>;
}

/**
 * Reads the package manager that launched us, e.g. `pnpm create qwrk-app`.
 */
function packageManager() {
  const agent = process.env.npm_config_user_agent ?? "";
  return ["pnpm", "yarn", "bun"].find((pm) => agent.startsWith(pm)) ?? "npm";
}

/**
 * Runs `<pm> install` in `cwd`, rejecting with its stderr when it fails.
 */
function install(pm: string, cwd: string) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(pm, ["install"], {
      cwd,
      stdio: ["ignore", "ignore", "pipe"],
      shell: process.platform === "win32",
    });
    let stderr = "";
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.on("error", (err: NodeJS.ErrnoException) =>
      reject(err.code === "ENOENT" ? new Error(`${pm} is not installed`) : err),
    );
    child.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(stderr.trim())),
    );
  });
}

process.stdout.write(`\n${logo()}\n\n`);
p.intro(styleText("inverse", " create-qwrk-app "));

const projectName =
  positionals[0] ??
  answer(
    await p.text({
      message: "Project name",
      placeholder: "qwrk-app",
      defaultValue: "qwrk-app",
    }),
  );

if (values.template && !TEMPLATES[values.template]) {
  p.cancel(`Unknown template "${values.template}". Use js or ts.`);
  process.exit(1);
}

const template =
  TEMPLATES[values.template ?? ""] ??
  answer(
    await p.select({
      message: "Select a variant",
      options: [
        { value: "qwrk-ts", label: styleText("blue", "TypeScript") },
        { value: "qwrk-js", label: styleText("yellow", "JavaScript") },
      ],
    }),
  );

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const targetDir = path.resolve(process.cwd(), projectName);
const templateDir = path.join(__dirname, "../templates", template);

if (fs.existsSync(targetDir)) {
  const overwrite = answer(
    await p.confirm({
      message: `Directory "${projectName}" already exists. Overwrite it?`,
      initialValue: false,
    }),
  );

  if (!overwrite) {
    p.cancel("Operation cancelled.");
    process.exit(1);
  }

  fs.rmSync(targetDir, { recursive: true, force: true });
}

fs.cpSync(templateDir, targetDir, { recursive: true });
fs.renameSync(
  path.join(targetDir, "_gitignore"),
  path.join(targetDir, ".gitignore"),
);
p.log.success(`Created ${styleText("cyan", projectName)}`);

const pm = packageManager();
const shouldInstall =
  values.install ??
  answer(await p.confirm({ message: `Install dependencies with ${pm}?` }));

let installed = false;

if (shouldInstall) {
  const spinner = p.spinner({ indicator: "timer" });
  spinner.start("Installing dependencies");

  try {
    await install(pm, targetDir);
    spinner.stop("Installed dependencies");
    installed = true;
  } catch (err) {
    spinner.error("Failed to install dependencies");
    p.log.error((err as Error).message);
  }
}

const steps = [
  `cd ${projectName}`,
  !installed && `${pm} install`,
  pm === "npm" || pm === "bun" ? `${pm} run dev` : `${pm} dev`,
].filter(Boolean);

p.box(steps.join("\n"), "Next steps", {
  width: "auto",
  rounded: true,
});
p.outro(styleText("green", "Happy hacking! ⚡"));
