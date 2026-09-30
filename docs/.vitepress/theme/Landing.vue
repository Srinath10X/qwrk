<script setup lang="ts">
import { withBase } from "vitepress";
import { onBeforeUnmount, onMounted, ref } from "vue";

const install = "npm create qwrk-app@latest";
const github = "https://github.com/Srinath10X/qwrk";
const copied = ref("");
const clicks = ref(0);
const flash = ref(0);
let reset: ReturnType<typeof setTimeout> | undefined;

/** Copies `text`, and marks which copy button did it. */
async function copy(where: string, text = install) {
  await navigator.clipboard.writeText(text);
  copied.value = where;
  clearTimeout(reset);
  reset = setTimeout(() => (copied.value = ""), 1800);
}

const landing = ref<HTMLElement>();
let settle: ReturnType<typeof setTimeout> | undefined;

/** Holds the aurora still while the page scrolls, so a scroll frame never waits on it to repaint. */
function pause() {
  landing.value?.classList.add("is-scrolling");
  clearTimeout(settle);
  settle = setTimeout(
    () => landing.value?.classList.remove("is-scrolling"),
    200,
  );
}

onMounted(() => addEventListener("scroll", pause, { passive: true }));

onBeforeUnmount(() => {
  removeEventListener("scroll", pause);
  clearTimeout(settle);
  clearTimeout(reset);
});

/** Runs the demo: a click writes the state, and both the binding in the code and the text it updates flash. */
function bump() {
  clicks.value++;
  flash.value++;
}

/**
 * The hero example, one token per span: keyword, string, punctuation, name,
 * function, number, and the `{count}` binding the demo highlights.
 */
const code: [string, string][][] = [
  [
    ["k", "import"],
    ["p", " { "],
    ["t", "state"],
    ["p", " } "],
    ["k", "from"],
    ["t", " "],
    ["s", '"qwrk"'],
    ["p", ";"],
  ],
  [],
  [
    ["k", "function"],
    ["t", " "],
    ["f", "Counter"],
    ["p", "() {"],
  ],
  [
    ["t", "  "],
    ["k", "const"],
    ["t", " count "],
    ["p", "="],
    ["t", " "],
    ["f", "state"],
    ["p", "("],
    ["n", "0"],
    ["p", ");"],
  ],
  [],
  [
    ["t", "  "],
    ["k", "return"],
    ["p", " ("],
  ],
  [
    ["t", "    "],
    ["p", "<"],
    ["k", "button"],
    ["t", " onClick"],
    ["p", "={() "],
    ["k", "=>"],
    ["t", " "],
    ["w", "count.value++"],
    ["p", "}>"],
  ],
  [
    ["t", "      clicked "],
    ["b", "{count}"],
    ["t", " times"],
  ],
  [
    ["t", "    "],
    ["p", "</"],
    ["k", "button"],
    ["p", ">"],
  ],
  [
    ["t", "  "],
    ["p", ");"],
  ],
  [["p", "}"]],
];

const managers = [
  {
    name: "npm",
    label: "npm",
    add: "npm i",
    install: "npm install",
    dev: "npm run dev",
  },
  {
    name: "bun",
    label: "Bun",
    add: "bun add",
    install: "bun install",
    dev: "bun run dev",
  },
  {
    name: "pnpm",
    label: "pnpm",
    add: "pnpm add",
    install: "pnpm install",
    dev: "pnpm dev",
  },
  {
    name: "yarn",
    label: "Yarn",
    add: "yarn add",
    install: "yarn install",
    dev: "yarn dev",
  },
];
const manager = ref(managers[0]);

type Point = [number, number, number];

/**
 * One piece of isometric art, painted in order: a block (a flat one is a
 * shadow, a ghost is only its edges), a curve that leaves and enters along
 * the x axis and may carry a beam, or a logo or a label on a top face.
 */
type Item =
  | {
      box: [...Point, number, number, number];
      kind?: "wire" | "lit" | "shadow" | "ghost";
    }
  | { path: [Point, Point]; sweep: number; beam?: number }
  | { logo: string; at: Point; size: number }
  | { label: string; at: Point; lit?: boolean };

const unit = 20;
const cos30 = Math.cos(Math.PI / 6);

/** Projects a point in block units onto the page, x running down and right, y down and left. */
function iso([x, y, z]: Point): [number, number] {
  return [(x - y) * cos30 * unit, ((x + y) / 2 - z) * unit];
}

/** Draws items at one font size, in page units, and returns the shapes with their bounds. */
function draw(items: Item[], font: number) {
  const xs: number[] = [];
  const ys: number[] = [];
  const at = (p: Point) => {
    const [x, y] = iso(p);
    xs.push(x);
    ys.push(y);
    return [x, y];
  };
  const pt = (p: Point) =>
    at(p)
      .map((n) => n.toFixed(1))
      .join(",");
  const shapes = items.map((item) => {
    if ("box" in item) {
      const [x, y, z, w, d, h] = item.box;
      const top = z + h;
      if (item.kind === "ghost") {
        const edge = (a: Point, b: Point) => `M${pt(a)} L${pt(b)}`;
        return {
          hidden: [
            edge([x, y, z], [x + w, y, z]),
            edge([x, y, z], [x, y + d, z]),
            edge([x, y, z], [x, y, top]),
          ].join(" "),
          edges: [
            `M${pt([x, y, top])} L${pt([x + w, y, top])} L${pt([x + w, y + d, top])} L${pt([x, y + d, top])} Z`,
            edge([x + w, y, z], [x + w, y, top]),
            edge([x + w, y + d, z], [x + w, y + d, top]),
            edge([x, y + d, z], [x, y + d, top]),
            edge([x + w, y, z], [x + w, y + d, z]),
            edge([x, y + d, z], [x + w, y + d, z]),
          ].join(" "),
        };
      }
      return {
        kind: item.kind ?? "wire",
        faces: [
          [
            [x, y, top],
            [x + w, y, top],
            [x + w, y + d, top],
            [x, y + d, top],
          ],
          [
            [x + w, y, z],
            [x + w, y + d, z],
            [x + w, y + d, top],
            [x + w, y, top],
          ],
          [
            [x, y + d, z],
            [x + w, y + d, z],
            [x + w, y + d, top],
            [x, y + d, top],
          ],
        ].map((face) => face.map((p) => pt(p as Point)).join(" ")),
      };
    }
    if ("path" in item) {
      const [a, b] = item.path;
      return {
        d: `M${pt(a)} C${pt([a[0] + item.sweep, a[1], a[2]])} ${pt([b[0] - item.sweep, b[1], b[2]])} ${pt(b)}`,
        beam: item.beam,
      };
    }
    if ("logo" in item) {
      const [x, y] = at(item.at);
      const half = (item.size * unit) / 2;
      return {
        logo: item.logo,
        size: half * 2,
        offset: -half,
        transform: `matrix(${cos30} 0.5 ${-cos30} 0.5 ${x.toFixed(1)} ${y.toFixed(1)})`,
      };
    }
    const [x, y] = at(item.at);
    return {
      label: item.label,
      lit: item.lit,
      transform: `matrix(${cos30} -0.5 ${cos30} 0.5 ${x.toFixed(1)} ${y.toFixed(1)})`,
    };
  });
  const pad = 14;
  const left = Math.min(...xs) - pad;
  const top = Math.min(...ys) - pad;
  const width = Math.max(...xs) + pad - left;
  const height = Math.max(...ys) + pad - top;
  return { view: `${left} ${top} ${width} ${height}`, height, font, shapes };
}

/** Draws a scene, sizing its text to read at about 11px once the art is fitted to its 192px well. */
function scene(items: Item[]) {
  let art = draw(items, 11);
  for (let pass = 0; pass < 2; pass++) {
    art = draw(items, (11 * art.height) / 192);
  }
  return art;
}

/** A floor of slabs, back to front, with the one a write reaches raised and lit. */
function fineGrained(): Item[] {
  const items: Item[] = [];
  for (let sum = 0; sum <= 7; sum++) {
    for (let i = 0; i <= 5; i++) {
      const j = sum - i;
      if (j < 0 || j > 2) continue;
      const lit = i === 3 && j === 1;
      items.push({
        box: [i * 1.3, j * 1.3, 0, 1, 1, lit ? 1.1 : 0.3],
        kind: lit ? "lit" : "wire",
      });
    }
  }
  return items;
}

/** Rows keyed a to g, back to front, with b and f lit as the pair that trades places. */
function keyedRows(): Item[] {
  const items: Item[] = [];
  for (let i = 0; i < 7; i++) {
    const lit = i === 1 || i === 5;
    items.push(
      { box: [i * 1.25, 0, 0, 0.9, 2.4, 0.3], kind: lit ? "lit" : "wire" },
      { label: "abcdefg"[i], at: [i * 1.25 + 0.45, 1.2, 0.3], lit },
    );
  }
  return items;
}

/**
 * One curve from the middle of each plate's front edge, along the floor,
 * bending into a parallel bundle that runs into the block. They stay in
 * order end to end, so they never cross, and each carries a beam of light.
 */
function sweep(plates: number[], x: number, into: Point): Item[] {
  return plates.map((y, i): Item => ({
    path: [
      [x, y + 0.8, 0.15],
      [into[0], into[1] - 0.4 + (i * 0.8) / (plates.length - 1), 0.15],
    ],
    sweep: 1.1,
    beam: i,
  }));
}

const bento = [
  {
    title: "Updates touch one node",
    text: "Changing a state re-runs the bindings that read it. If one text node shows count, that text node is all that changes.",
    wide: true,
    art: scene(fineGrained()),
  },
  {
    title: "As low as 2.9 KB",
    text: "A counter app, runtime included, is 2.9 KB gzipped when built with esbuild and the Qwrk plugin.",
    art: scene([
      { box: [0, 0, 0, 3.2, 3.2, 3.2], kind: "ghost" },
      { box: [4.8, 1.4, 0, 0.9, 0.9, 0.9], kind: "lit" },
    ]),
  },
  {
    title: "Components run once",
    text: "A component is a function that returns DOM nodes. Qwrk calls it once, and bindings handle every change after that.",
    art: scene([
      { box: [0, 0, 0, 3, 3, 0.4] },
      { box: [0.6, 0.6, 0.4, 1.8, 1.8, 0.4] },
      { box: [1.1, 1.1, 0.8, 0.8, 0.8, 0.4], kind: "lit" },
    ]),
  },
  {
    title: "JSX becomes templates",
    text: "The compiler turns static JSX into a <template> and copies it with cloneNode(true). Only the dynamic parts get a binding.",
    art: scene([
      { box: [0, 0, 0, 0.25, 2.2, 2.8], kind: "lit" },
      { box: [1.6, 0, 0, 0.25, 2.2, 2.8] },
      { box: [3.2, 0, 0, 0.25, 2.2, 2.8] },
      { box: [4.8, 0, 0, 0.25, 2.2, 2.8] },
    ]),
  },
  {
    title: "Batched writes",
    text: "Wrap several writes in batch() and derives, the DOM and effects update once, after the last write.",
    art: scene([
      { box: [0, 0, 0, 3, 3, 0.2] },
      { box: [0, 0, 0.8, 3, 3, 0.2] },
      { box: [0, 0, 1.6, 3, 3, 0.2] },
      { box: [0, 0, 2.6, 3, 3, 0.3], kind: "lit" },
    ]),
  },
  {
    title: "Keyed lists",
    text: "Render lists with .map(). Rows are keyed by item, so a sort moves the existing DOM nodes instead of rebuilding them.",
    wide: true,
    art: scene(keyedRows()),
  },
  {
    title: "TypeScript, Vite, esbuild",
    text: "Types ship with the package. There are plugins for Vite and esbuild, and .svg files import as components.",
    art: scene([
      { box: [0, 0, 0, 1.6, 1.6, 0.3] },
      { logo: "typescript", at: [0.8, 0.8, 0.3], size: 0.95 },
      { box: [0, 2.2, 0, 1.6, 1.6, 0.3] },
      { logo: "vite", at: [0.8, 3, 0.3], size: 0.95 },
      { box: [0, 4.4, 0, 1.6, 1.6, 0.3] },
      { logo: "esbuild", at: [0.8, 5.2, 0.3], size: 0.95 },
      ...sweep([0, 2.2, 4.4], 1.6, [4.3, 3, 0.8]),
      { box: [4, 2.2, 0, 1.6, 1.6, 1.6], kind: "lit" },
    ]),
  },
];

const links = [
  { text: "Docs", href: withBase("/guide/") },
  { text: "API", href: withBase("/api/state") },
  { text: "GitHub", href: github },
  { text: "npm", href: "https://www.npmjs.com/package/qwrk" },
];
</script>

<template>
  <div ref="landing" class="q-landing">
    <div class="q-aurora" aria-hidden="true"></div>
    <section class="q-hero">
      <div class="q-hero__copy enter">
        <h1 class="q-hero__title">
          Reactive UI,<br />no re-renders<span class="q-signal">.</span>
        </h1>
        <p class="q-hero__pitch">
          A Qwrk component runs once and returns real DOM. When a state changes,
          only the text or attribute that reads it is updated.
        </p>
        <div class="q-actions">
          <a
            class="q-btn q-btn--primary q-btn--lg"
            :href="withBase('/guide/getting-started')"
          >
            Get started
          </a>
          <a class="q-btn q-btn--secondary q-btn--lg" :href="github">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M12 .5C5.65.5.5 5.65.5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2c-3.2.7-3.87-1.37-3.87-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.42-2.69 5.39-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z"
              />
            </svg>
            Star on GitHub
          </a>
        </div>
        <div class="q-install">
          <div class="q-install__tabs" aria-label="Package manager">
            <button
              v-for="m in managers"
              :key="m.name"
              type="button"
              class="q-install__tab"
              :aria-pressed="manager.name === m.name"
              @click="manager = m"
            >
              <img
                :src="withBase(`/logos/${m.name}.svg`)"
                alt=""
                width="14"
                height="14"
              />
              {{ m.label }}
            </button>
          </div>
          <div class="q-install__row">
            <span class="q-install__prompt" aria-hidden="true">$</span>
            <code class="q-install__cmd"
              >{{ manager.name }} create qwrk-app@latest</code
            >
            <button
              type="button"
              class="q-install__copy"
              :aria-label="
                copied === 'hero' ? 'Copied' : 'Copy the install command'
              "
              @click="copy('hero', `${manager.name} create qwrk-app@latest`)"
            >
              <svg
                v-if="copied !== 'hero'"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <rect x="8.5" y="8.5" width="12" height="12" rx="2" />
                <path
                  d="M15.5 8.5v-3a2 2 0 0 0-2-2h-8a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3"
                />
              </svg>
              <svg v-else viewBox="0 0 24 24" aria-hidden="true">
                <path d="m5 12.5 4.5 4.5L19 7.5" />
              </svg>
            </button>
          </div>
        </div>
        <p class="q-hero__beta">
          Qwrk 0.4 is in beta:
          <code>{{ manager.add }} qwrk@next qwrk-vite@next</code>
          <a :href="withBase('/guide/getting-started#try-the-0-4-beta')">
            Try the beta
          </a>
        </p>
      </div>

      <div class="q-hero__code">
        <figure class="q-editor">
          <div class="q-editor__bar">
            <span class="q-lights" aria-hidden="true">
              <i></i><i></i><i></i>
            </span>
            <span class="q-editor__tab"
              ><img
                :src="withBase('/qwrk.svg')"
                alt=""
                width="14"
                height="14"
              />Counter.tsx</span
            >
          </div>
          <pre
            class="q-editor__code"
          ><code><span v-for="(line, i) in code" :key="i" class="q-editor__line"><span v-for="([kind, text], j) in line" :key="kind === 'b' || kind === 'w' ? `${kind}${flash}` : j" :class="['t-' + kind, (kind === 'b' || kind === 'w') && flash ? 'is-flash' : '']">{{ text }}</span></span></code></pre>
          <div class="q-editor__status" aria-hidden="true">
            <span>TypeScript JSX</span>
            <span>Ln 8, Col 22</span>
            <span>Spaces: 2</span>
          </div>
        </figure>
        <div class="q-output" role="group" aria-label="Output">
          <div class="q-output__bar">
            <span class="q-lights" aria-hidden="true">
              <i></i><i></i><i></i>
            </span>
            <svg
              class="q-output__nav q-output__nav--wide"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <rect x="3.5" y="5" width="17" height="14" rx="3" />
              <path d="M9.5 5v14M6 8.5h1M6 11h1" />
            </svg>
            <svg class="q-output__nav" viewBox="0 0 24 24" aria-hidden="true">
              <path d="m14.5 6-6 6 6 6" />
            </svg>
            <svg
              class="q-output__nav q-output__nav--wide is-off"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="m9.5 6 6 6-6 6" />
            </svg>
            <svg
              class="q-output__nav q-output__nav--wide"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                d="M12 3.5 5.5 6v5.5c0 4 2.8 7.4 6.5 8.5 3.7-1.1 6.5-4.5 6.5-8.5V6Z"
              />
              <path d="M12 3.5v16.5" />
            </svg>
            <span class="q-output__address">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="5.5" y="10.5" width="13" height="9" rx="2" />
                <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
              </svg>
              localhost:5173
              <svg
                class="q-output__reload"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M19 12a7 7 0 1 1-2.05-4.95M19 4.5v4h-4" />
              </svg>
            </span>
            <svg
              class="q-output__nav q-output__nav--wide"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                d="M12 3.5v11M8.5 7 12 3.5 15.5 7M8.5 10H7a1.5 1.5 0 0 0-1.5 1.5v7A1.5 1.5 0 0 0 7 20h10a1.5 1.5 0 0 0 1.5-1.5v-7A1.5 1.5 0 0 0 17 10h-1.5"
              />
            </svg>
            <svg class="q-output__nav" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 5.5v13M5.5 12h13" />
            </svg>
            <svg class="q-output__nav" viewBox="0 0 24 24" aria-hidden="true">
              <rect x="8" y="8" width="12.5" height="12.5" rx="2.5" />
              <path
                d="M16 8V6a2.5 2.5 0 0 0-2.5-2.5h-7A2.5 2.5 0 0 0 4 6v7a2.5 2.5 0 0 0 2.5 2.5H8"
              />
            </svg>
          </div>
          <div class="q-output__view">
            <button type="button" class="q-demo" @click="bump">
              clicked
              <span
                :key="flash"
                :class="['q-demo__n', flash ? 'is-flash' : '']"
                >{{ clicks }}</span
              >
              times
            </button>
          </div>
        </div>
      </div>
    </section>

    <section class="q-features">
      <div class="q-head">
        <p class="q-label">Features</p>
        <h2 class="q-h2">Under the hood<span class="q-signal">.</span></h2>
        <p class="q-lede">
          A small runtime keeps track of state. The compiler turns your JSX into
          plain DOM code at build time.
        </p>
      </div>

      <div class="q-bento">
        <article
          v-for="cell in bento"
          :key="cell.title"
          :class="['q-bento__cell', cell.wide && 'q-bento__cell--wide']"
        >
          <div class="q-bento__art">
            <svg
              :viewBox="cell.art.view"
              preserveAspectRatio="xMidYMid meet"
              aria-hidden="true"
            >
              <template v-for="(shape, k) in cell.art.shapes" :key="k">
                <g v-if="'edges' in shape" class="q-ghost">
                  <path class="q-ghost__hidden" :d="shape.hidden" />
                  <path :d="shape.edges" />
                </g>
                <g
                  v-else-if="'faces' in shape"
                  :class="`q-box q-box--${shape.kind}`"
                >
                  <polygon
                    v-for="(face, n) in shape.faces"
                    :key="n"
                    :class="`q-face q-face--${n}`"
                    :points="face"
                  />
                </g>
                <template v-else-if="'d' in shape">
                  <path class="q-flow" :d="shape.d" />
                  <path
                    v-if="shape.beam !== undefined"
                    class="q-beam"
                    :d="shape.d"
                    pathLength="100"
                    :style="{
                      animationDelay: `${shape.beam * 0.9}s`,
                      animationDuration: `${3 + shape.beam * 0.55}s`,
                    }"
                  />
                </template>
                <image
                  v-else-if="'logo' in shape"
                  :href="withBase(`/logos/${shape.logo}.svg`)"
                  :x="shape.offset"
                  :y="shape.offset"
                  :width="shape.size"
                  :height="shape.size"
                  :transform="shape.transform"
                />
                <text
                  v-else
                  :class="['q-tag', shape.lit && 'q-tag--lit']"
                  :transform="shape.transform"
                  :font-size="cell.art.font"
                  text-anchor="middle"
                  dominant-baseline="central"
                >
                  {{ shape.label }}
                </text>
              </template>
            </svg>
          </div>
          <div class="q-bento__body">
            <h3 class="q-bento__title">{{ cell.title }}</h3>
            <p class="q-bento__text">{{ cell.text }}</p>
          </div>
        </article>
      </div>
    </section>

    <section class="q-start">
      <div class="q-start__copy">
        <h2 class="q-h2">Create an app<span class="q-signal">.</span></h2>
        <p class="q-lede">
          create-qwrk-app sets up a Vite project with the compiler configured.
          Pick JavaScript or TypeScript, then run the commands it prints.
        </p>
        <div class="q-actions">
          <a
            class="q-btn q-btn--primary q-btn--lg"
            :href="withBase('/guide/getting-started')"
          >
            Read the guide
          </a>
          <a
            class="q-btn q-btn--outline q-btn--lg"
            :href="withBase('/api/state')"
          >
            API reference
          </a>
        </div>
      </div>

      <div class="q-term">
        <div class="q-term__bar">
          <div class="q-term__tabs" aria-label="Package manager">
            <button
              v-for="m in managers"
              :key="m.name"
              type="button"
              class="q-term__tab"
              :aria-pressed="manager.name === m.name"
              @click="manager = m"
            >
              <img
                :src="withBase(`/logos/${m.name}.svg`)"
                alt=""
                width="16"
                height="16"
              />
              {{ m.label }}
            </button>
          </div>
          <button
            type="button"
            class="q-install__copy"
            :aria-label="
              copied === 'term' ? 'Copied' : 'Copy the create command'
            "
            @click="copy('term', `${manager.name} create qwrk-app@latest`)"
          >
            <svg
              v-if="copied !== 'term'"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <rect x="8.5" y="8.5" width="12" height="12" rx="2" />
              <path
                d="M15.5 8.5v-3a2 2 0 0 0-2-2h-8a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3"
              />
            </svg>
            <svg v-else viewBox="0 0 24 24" aria-hidden="true">
              <path d="m5 12.5 4.5 4.5L19 7.5" />
            </svg>
          </button>
        </div>
        <pre
          class="q-term__body"
        ><code><span class="q-term__line"><span class="q-term__prompt">$</span> {{ manager.name }} create qwrk-app@latest my-app</span><span class="q-term__line"><span class="q-term__prompt">$</span> cd my-app</span><span class="q-term__line"><span class="q-term__prompt">$</span> {{ manager.install }}</span><span class="q-term__line"><span class="q-term__prompt">$</span> {{ manager.dev }}</span></code></pre>
      </div>
      <span class="visually-hidden" aria-live="polite">{{
        copied ? "Copied to clipboard" : ""
      }}</span>
    </section>

    <footer class="q-footer">
      <a class="q-footer__brand" :href="withBase('/')" aria-label="Qwrk, home">
        <img :src="withBase('/qwrk.svg')" alt="" width="22" height="22" />
        <span>Qwrk</span>
      </a>
      <nav class="q-footer__links" aria-label="Footer">
        <a v-for="link in links" :key="link.text" :href="link.href">{{
          link.text
        }}</a>
      </nav>
      <p class="q-footer__legal">MIT licensed &middot; Srinath10X</p>
    </footer>
  </div>
</template>

<style scoped>
.q-landing {
  position: relative;
  isolation: isolate;
  overflow-x: clip;
}

.q-landing > :not(.q-aurora) {
  position: relative;
  z-index: 1;
}

.q-hero {
  display: grid;
  border-bottom: 1px solid var(--q-border);
}

@media (min-width: 1024px) {
  .q-hero {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    align-items: center;
  }
}

/*
 * Aurora: page-coloured stripes over a blue, pink and teal band, blurred and
 * faded out from the top right. A second copy drifts across it and blends by
 * difference, so the light slowly shifts.
 */
.q-aurora {
  --q-stripes: repeating-linear-gradient(
    100deg,
    var(--q-bg) 0%,
    var(--q-bg) 7%,
    transparent 10%,
    transparent 12%,
    var(--q-bg) 16%
  );
  --q-rainbow: repeating-linear-gradient(
    100deg,
    #60a5fa 10%,
    #e879f9 15%,
    #60a5fa 20%,
    #5eead4 25%,
    #60a5fa 30%
  );
  position: absolute;
  top: calc(-1 * var(--vp-nav-height) - 10px);
  right: -10px;
  left: -10px;
  z-index: 0;
  height: 640px;
  pointer-events: none;
  background-image: var(--q-stripes), var(--q-rainbow);
  background-size: 300%, 200%;
  background-position:
    50% 50%,
    50% 50%;
  filter: blur(10px) opacity(50%) saturate(200%);
  -webkit-mask-image:
    linear-gradient(to right, transparent 25%, black 55%),
    linear-gradient(to bottom, black 20%, transparent 85%);
  -webkit-mask-composite: source-in;
  mask-image:
    linear-gradient(to right, transparent 25%, black 55%),
    linear-gradient(to bottom, black 20%, transparent 85%);
  mask-composite: intersect;
}

.q-aurora::after {
  content: "";
  position: absolute;
  inset: 0;
  background-image: var(--q-stripes), var(--q-rainbow);
  background-size: 200%, 100%;
  mix-blend-mode: difference;
  animation: q-aurora 60s linear infinite;
}

.q-landing.is-scrolling .q-aurora::after {
  animation-play-state: paused;
}

@keyframes q-aurora {
  from {
    background-position:
      50% 50%,
      50% 50%;
  }
  to {
    background-position:
      350% 50%,
      350% 50%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .q-aurora::after {
    animation: none;
  }
}

.q-hero__copy {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 20px;
  padding: 48px 20px 8px;
}

@media (min-width: 640px) {
  .q-hero__copy {
    padding: 72px 40px 16px;
  }
}

@media (min-width: 1024px) {
  .q-hero__copy {
    padding: 88px 24px 88px 48px;
  }
}

.q-hero__title {
  margin: 0;
  font-size: 40px;
  font-weight: 700;
  line-height: 1.02;
  letter-spacing: -0.04em;
  color: var(--q-fg);
  text-wrap: balance;
}

@media (min-width: 640px) {
  .q-hero__title {
    font-size: 52px;
  }
}

@media (min-width: 1280px) {
  .q-hero__title {
    font-size: 64px;
  }
}

.q-hero__pitch {
  max-width: 40ch;
  margin: 0;
  font-size: 16px;
  line-height: 1.6;
  color: var(--q-muted);
  text-wrap: pretty;
}

@media (min-width: 1024px) {
  .q-hero__pitch {
    font-size: 17px;
  }
}

.q-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 6px;
}

.q-install {
  position: relative;
  width: 100%;
  max-width: 420px;
  overflow: hidden;
  border-radius: 12px;
  background: rgb(17 16 15 / 0.78);
  -webkit-backdrop-filter: blur(40px) saturate(130%);
  backdrop-filter: blur(40px) saturate(130%);
  font-family: var(--vp-font-family-mono);
  font-size: 13.5px;
  text-align: left;
}

.q-hero__copy .q-install {
  margin-top: 16px;
}

/*
 * Hairline ring for the rounded panels: brightest where light catches the top
 * right corner, faint along the edges, with a soft glint at the bottom left.
 */
.q-install::before,
.q-editor::before,
.q-output::before,
.q-term::before,
.q-bento__cell::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 1;
  padding: 1px;
  border-radius: inherit;
  background: linear-gradient(
    225deg,
    rgb(255 255 255 / 0.15),
    rgb(255 255 255 / 0.07) 40%,
    rgb(255 255 255 / 0.06) 75%,
    rgb(255 255 255 / 0.09)
  );
  -webkit-mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
}

.q-install__tabs {
  display: flex;
  border-bottom: 1px solid var(--q-border);
}

.q-install__tab {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin-bottom: -1px;
  --q-tab-x: 14px;
  padding: 9px 14px 8px;
  font-family: var(--vp-font-family-base);
  font-size: 13px;
  font-weight: 500;
  color: var(--q-muted);
  transition: color 0.15s;
}

.q-install__tab::after,
.q-term__tab::after {
  content: "";
  position: absolute;
  right: var(--q-tab-x);
  bottom: -1px;
  left: var(--q-tab-x);
  height: 2px;
  border-radius: 2px;
  background: transparent;
}

.q-install__tab[aria-pressed="true"]::after,
.q-term__tab[aria-pressed="true"]::after {
  background: var(--q-accent);
}

.q-install__tab:hover {
  color: var(--q-fg);
}

.q-install__tab[aria-pressed="true"] {
  color: var(--q-fg);
}

.q-install__tab img {
  width: 14px;
  height: 14px;
  flex: none;
}

.q-install__row {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 46px;
  padding: 0 6px 0 16px;
}

.q-install__prompt {
  color: var(--q-label);
  user-select: none;
}

.q-install__cmd {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  font: inherit;
  color: var(--q-fg);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.q-install__copy {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 6px;
  color: var(--q-muted);
  transition:
    color 0.15s,
    background-color 0.15s;
}

.q-install__copy:hover {
  color: var(--q-fg);
  background: var(--q-surface);
}

.q-install__copy:active {
  translate: 0 1px;
}

.q-install__copy svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.q-hero__beta {
  margin: 0;
  font-size: 13.5px;
  line-height: 1.7;
  color: var(--q-muted);
}

.q-hero__beta code {
  margin: 0 6px 0 2px;
  white-space: nowrap;
  font-family: var(--vp-font-family-mono);
  font-size: 12.5px;
  color: var(--q-fg);
}

.q-hero__beta a {
  color: var(--q-muted);
  text-decoration: underline;
  text-decoration-color: var(--q-border-strong);
  text-underline-offset: 4px;
  transition:
    color 0.15s,
    text-decoration-color 0.15s;
}

.q-hero__beta a:hover {
  color: var(--q-fg);
  text-decoration-color: var(--q-accent);
}

.q-hero__code {
  min-width: 0;
  padding: 32px 20px 48px;
}

@media (min-width: 640px) {
  .q-hero__code {
    padding: 40px 40px 72px;
  }
}

@media (min-width: 1024px) {
  .q-hero__code {
    padding: 48px 80px 48px 0;
    margin-left: -8px;
  }
}

.q-editor {
  position: relative;
  margin: 0;
  overflow: hidden;
  border-radius: 12px;
  background: rgb(17 16 15 / 0.78);
  -webkit-backdrop-filter: blur(40px) saturate(130%);
  backdrop-filter: blur(40px) saturate(130%);
}

.q-editor__bar {
  display: flex;
  border-bottom: 1px solid var(--q-border);
}

.q-editor__bar .q-lights {
  align-self: center;
  margin: 0;
  padding: 0 14px 0 16px;
}

.q-editor__status {
  display: flex;
  align-items: center;
  gap: 16px;
  height: 28px;
  padding: 0 16px;
  border-top: 1px solid var(--q-border);
  font-family: var(--vp-font-family-mono);
  font-size: 11.5px;
  color: var(--q-label);
  white-space: nowrap;
}

@media (max-width: 639px) {
  .q-editor__status {
    display: none;
  }
}

.q-editor__tab {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-bottom: -1px;
  --q-tab-x: 18px;
  padding: 10px 18px 9px;
  border-right: 1px solid var(--q-border);
  background: transparent;
  font-family: var(--vp-font-family-mono);
  font-size: 13.5px;
  color: var(--q-fg);
}

.q-editor__code {
  margin: 0;
  padding: 18px 20px 20px 0;
  overflow-x: auto;
  counter-reset: line;
  font-family: var(--vp-font-family-mono);
  font-size: 12.5px;
  line-height: 1.75;
  color: #d8d4cf;
  tab-size: 2;
}

@media (min-width: 640px) {
  .q-editor__code {
    font-size: 14.5px;
  }
}

.q-editor__code code {
  display: block;
  width: max-content;
  min-width: 100%;
  font: inherit;
}

.q-editor__line {
  display: block;
  min-height: 1.75em;
  white-space: pre;
  counter-increment: line;
}

.q-editor__line::before {
  content: counter(line);
  display: inline-block;
  width: 2ch;
  margin: 0 18px 0 16px;
  text-align: right;
  color: var(--q-label);
  opacity: 0.55;
  user-select: none;
}

.t-k {
  color: var(--q-accent);
}

.t-s,
.t-n {
  color: #d6c4a4;
}

.t-p {
  color: #8a847d;
}

.t-f,
.t-b,
.t-w {
  color: var(--q-fg);
}

.t-b,
.t-w {
  border-radius: 3px;
}

.is-flash {
  animation: q-flash 1.4s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes q-flash {
  0%,
  30% {
    color: var(--q-accent);
    background-color: var(--q-accent-soft);
  }
}

/*
 * The output window sits in front of the editor, over its lower right
 * corner, and casts a shadow onto it.
 */
.q-hero__code {
  position: relative;
}

.q-output {
  position: relative;
  z-index: 2;
  width: min(420px, 94%);
  margin: -24px 0 0 auto;
  overflow: hidden;
  border-radius: 12px;
  background: rgb(22 21 19 / 0.86);
  -webkit-backdrop-filter: blur(24px) saturate(130%);
  backdrop-filter: blur(24px) saturate(130%);
  box-shadow:
    0 24px 48px -12px rgb(0 0 0 / 0.7),
    0 8px 16px -8px rgb(0 0 0 / 0.5);
}

@media (min-width: 640px) {
  .q-editor {
    margin-right: 64px;
  }

  .q-output {
    margin-top: -96px;
    margin-right: -8px;
  }
}

@media (min-width: 1024px) {
  .q-output {
    margin-right: -24px;
  }
}

.q-output__bar {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 42px;
  padding: 0 14px;
  border-bottom: 1px solid rgb(0 0 0 / 0.4);
  background: #252422;
}

.q-lights {
  display: flex;
  gap: 6px;
  margin-right: 4px;
}

.q-lights i {
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: #ff5f57;
}

.q-lights i:nth-child(2) {
  background: #febc2e;
}

.q-lights i:nth-child(3) {
  background: #28c840;
}

.q-output__nav {
  flex: none;
  width: 15px;
  height: 15px;
  fill: none;
  stroke: #aaa49e;
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}

@media (max-width: 639px) {
  .q-output__bar {
    gap: 8px;
  }

  .q-output__nav--wide {
    display: none;
  }
}

.q-output__address ~ .q-output__nav {
  margin-left: 6px;
}

.q-output__nav.is-off {
  stroke: #56524d;
}

.q-output__address {
  position: relative;
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  gap: 5px;
  min-width: 0;
  height: 28px;
  margin: 0 2px;
  padding: 0 26px;
  border-radius: 8px;
  background: rgb(255 255 255 / 0.07);
  font-size: 12.5px;
  color: #dcd8d3;
  white-space: nowrap;
}

.q-output__address svg {
  width: 11px;
  height: 11px;
  flex: none;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.q-output__address .q-output__reload {
  position: absolute;
  right: 9px;
}

@media (max-width: 639px) {
  .q-output__address {
    padding: 0 8px;
  }

  .q-output__address .q-output__reload {
    display: none;
  }
}

.q-output__view {
  display: grid;
  place-items: center;
  min-height: 140px;
  padding: 24px 16px;
  background: var(--q-bg);
}

.q-demo {
  display: inline-block;
  height: 34px;
  line-height: 32px;
  padding: 0 14px;
  border: 1px solid var(--q-border-strong);
  border-radius: 8px;
  background: var(--q-surface);
  font-size: 14px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  color: var(--q-fg);
  transition:
    background-color 0.15s,
    border-color 0.15s;
}

.q-demo:hover {
  border-color: var(--q-muted);
}

.q-demo:active {
  translate: 0 1px;
}

.q-demo__n {
  min-width: 1ch;
  padding: 0 2px;
  border-radius: 3px;
}

.q-features {
  border-bottom: 1px solid var(--q-border);
}

.q-head {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 16px;
  padding: 56px 20px 32px;
}

@media (min-width: 640px) {
  .q-head {
    padding: 72px 40px 40px;
  }
}

@media (min-width: 1024px) {
  .q-head {
    padding: 96px 48px 48px;
  }
}

.q-h2 {
  margin: 0;
  font-size: clamp(30px, 3.4vw, 44px);
  font-weight: 700;
  line-height: 1.04;
  letter-spacing: -0.035em;
  color: var(--q-fg);
  text-wrap: balance;
}

.q-lede {
  max-width: 58ch;
  margin: 0;
  font-size: 16px;
  line-height: 1.65;
  color: var(--q-muted);
  text-wrap: pretty;
}

.q-bento {
  display: grid;
  gap: 12px;
  padding: 0 20px 56px;
}

@media (min-width: 768px) {
  .q-bento {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    padding: 0 40px 72px;
  }

  .q-bento__cell--wide,
  .q-bento__cell:last-child {
    grid-column: span 2;
  }
}

@media (min-width: 1024px) {
  .q-bento {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    padding: 0 48px 96px;
  }

  .q-bento__cell:last-child:not(.q-bento__cell--wide) {
    grid-column: auto;
  }
}

.q-bento__cell {
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
  border-radius: 12px;
  background: linear-gradient(
    180deg,
    rgb(28 27 25 / 0.72),
    rgb(17 16 15 / 0.9)
  );
}

/*
 * Art well: a faint dot floor that fades out toward the edges, with the
 * isometric scene drawn over it in hairlines.
 */
.q-bento__art {
  position: relative;
  height: 220px;
  padding: 24px 24px 4px;
}

.q-bento__art::before {
  content: "";
  position: absolute;
  inset: 0;
  background-image: radial-gradient(
    rgb(246 245 244 / 0.09) 1px,
    transparent 1px
  );
  background-size: 14px 14px;
  -webkit-mask-image: radial-gradient(
    ellipse at 50% 55%,
    black 10%,
    transparent 70%
  );
  mask-image: radial-gradient(ellipse at 50% 55%, black 10%, transparent 70%);
}

.q-bento__art svg {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
}

.q-bento__body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px 24px 24px;
}

/*
 * Wide cells on desktop: copy on the left, pinned to the bottom, and the art
 * filling the rest of the cell at its full height.
 */
@media (min-width: 1024px) {
  .q-bento__cell--wide {
    flex-direction: row-reverse;
  }

  .q-bento__cell--wide .q-bento__art {
    flex: 1.4;
    height: auto;
    min-height: 260px;
    padding: 28px 32px;
  }

  .q-bento__cell--wide .q-bento__body {
    flex: 1;
    justify-content: flex-end;
    padding: 24px 0 28px 28px;
  }
}

.q-bento__title {
  margin: 0;
  font-size: 17px;
  font-weight: 650;
  line-height: 1.3;
  letter-spacing: -0.02em;
  color: var(--q-fg);
}

.q-bento__text {
  max-width: 52ch;
  margin: 0;
  font-size: 14.5px;
  line-height: 1.6;
  color: var(--q-muted);
  text-wrap: pretty;
}

.q-face {
  stroke-width: 1;
  stroke-linejoin: round;
  vector-effect: non-scaling-stroke;
}

.q-box--wire .q-face {
  stroke: rgb(246 245 244 / 0.36);
}

.q-box--wire .q-face--0 {
  fill: #272624;
}

.q-box--wire .q-face--1 {
  fill: #1a1917;
}

.q-box--wire .q-face--2 {
  fill: #121110;
}

.q-ghost path {
  fill: none;
  stroke: rgb(246 245 244 / 0.34);
  stroke-width: 1;
  stroke-linejoin: round;
  vector-effect: non-scaling-stroke;
}

.q-ghost .q-ghost__hidden {
  stroke: rgb(246 245 244 / 0.12);
}

.q-box--shadow .q-face {
  fill: rgb(0 0 0 / 0.5);
  stroke: none;
}

.q-box--lit,
.q-tag--lit {
  transition: translate 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

.q-box--lit .q-face {
  stroke: rgb(214 228 253 / 0.8);
}

.q-box--lit .q-face--0 {
  fill: #bcd4fd;
}

.q-box--lit .q-face--1 {
  fill: #89b4fa;
}

.q-box--lit .q-face--2 {
  fill: #5877ab;
}

.q-bento__cell:hover .q-box--lit,
.q-bento__cell:hover .q-tag--lit {
  translate: 0 -4px;
}

.q-flow {
  fill: none;
  stroke: rgb(246 245 244 / 0.42);
  stroke-width: 1;
  stroke-linecap: round;
  stroke-linejoin: round;
  vector-effect: non-scaling-stroke;
}

/*
 * A short dash of light that runs the length of its curve, then waits off
 * the end. Each curve gets its own delay and pace, so the beams never march
 * in step.
 */
.q-beam {
  fill: none;
  stroke: var(--q-accent);
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-dasharray: 12 188;
  stroke-dashoffset: 12;
  animation: q-beam 3s linear infinite;
}

@keyframes q-beam {
  70%,
  100% {
    stroke-dashoffset: -100;
  }
}

.q-landing.is-scrolling .q-beam {
  animation-play-state: paused;
}

.q-tag {
  font-family: var(--vp-font-family-mono);
  font-weight: 600;
  fill: var(--q-muted);
}

.q-tag--lit {
  fill: #0f1a2c;
}

@media (prefers-reduced-motion: reduce) {
  .q-beam {
    display: none;
  }

  .q-box--lit,
  .q-tag--lit {
    transition: none;
  }
}

.q-start {
  display: grid;
  gap: 32px;
  padding: 56px 20px;
  border-bottom: 1px solid var(--q-border);
}

@media (min-width: 640px) {
  .q-start {
    padding: 72px 40px;
  }
}

@media (min-width: 1024px) {
  .q-start {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    align-items: center;
    gap: 48px;
    padding: 96px 48px;
  }
}

.q-start__copy {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 16px;
}

.q-start__copy .q-lede {
  max-width: 46ch;
}

.q-term {
  position: relative;
  min-width: 0;
  overflow: hidden;
  border-radius: 12px;
  background: var(--q-code);
}

.q-term__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-right: 6px;
  border-bottom: 1px solid var(--q-border);
}

.q-term__tabs {
  display: flex;
}

.q-term__tab {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-bottom: -1px;
  --q-tab-x: 16px;
  padding: 10px 16px 9px;
  font-size: 13.5px;
  font-weight: 500;
  color: var(--q-muted);
  transition: color 0.15s;
}

.q-term__tab img {
  width: 16px;
  height: 16px;
  flex: none;
}

.q-term__tab:hover {
  color: var(--q-fg);
}

.q-term__tab[aria-pressed="true"] {
  color: var(--q-fg);
}

.q-term__body {
  margin: 0;
  padding: 18px 20px 20px;
  overflow-x: auto;
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
  line-height: 1.9;
  color: #d8d4cf;
}

.q-term__body code {
  font: inherit;
}

.q-term__line {
  display: block;
  white-space: pre;
}

.q-term__prompt {
  color: var(--q-label);
  user-select: none;
}

.q-footer {
  display: grid;
  gap: 20px;
  padding: 32px 20px 36px;
}

@media (min-width: 768px) {
  .q-footer {
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 32px;
    padding: 28px 40px;
  }
}

@media (min-width: 1024px) {
  .q-footer {
    padding: 28px 48px;
  }
}

.q-footer__brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 17px;
  font-weight: 700;
  letter-spacing: -0.04em;
  color: var(--q-fg);
}

.q-footer__links {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 24px;
}

@media (min-width: 768px) {
  .q-footer__links {
    padding-left: 32px;
    border-left: 1px solid var(--q-border);
  }
}

.q-footer__links a {
  font-size: 14.5px;
  font-weight: 500;
  color: var(--q-muted);
  transition: color 0.15s;
}

.q-footer__links a:hover {
  color: var(--q-fg);
}

.q-footer__legal {
  margin: 0;
  font-size: 13px;
  color: var(--q-label);
}
</style>
