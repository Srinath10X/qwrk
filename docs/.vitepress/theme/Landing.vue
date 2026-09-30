<script setup lang="ts">
import { withBase } from "vitepress";
import { onBeforeUnmount, ref } from "vue";
import { logos } from "./pm-logos";

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

onBeforeUnmount(() => clearTimeout(reset));

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
    ["t", " count"],
    ["p", "."],
    ["t", "value"],
    ["p", "++}>"],
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
  { name: "npm", install: "npm install", dev: "npm run dev" },
  { name: "bun", install: "bun install", dev: "bun run dev" },
  { name: "pnpm", install: "pnpm install", dev: "pnpm dev" },
  { name: "yarn", install: "yarn install", dev: "yarn dev" },
];
const manager = ref(managers[0]);

const steps = [
  {
    label: "Run once",
    title: "Components run once",
    text: "A component is a plain function that returns real DOM nodes. After that first call, it never runs again.",
    code: "document.body.append(<Counter />)",
  },
  {
    label: "Bind",
    title: "Reads become bindings",
    text: "Each place that reads a state, a text node, an attribute or a list row, subscribes to that state on its own.",
    code: "<p>{count.value * 2}</p>",
  },
  {
    label: "Update",
    title: "Writes reach only readers",
    text: "A write re-runs the bindings that read that state, and nothing else. There is no tree to diff.",
    code: "count.value++",
  },
];

const features = [
  {
    label: "State",
    title: "Fine-grained state",
    text: "state() holds any value. Arrays and plain objects notify when you change them in place, at any depth.",
    code: "todos.value.push(todo)",
  },
  {
    label: "Derive",
    title: "Glitch-free derives",
    text: "derive() recomputes once per change, after the derives it reads, so it never sees a half-updated state.",
    code: "derive(() => price.value * 2)",
  },
  {
    label: "Batch",
    title: "Grouped writes",
    text: "batch() turns several writes into one update: derives, the DOM and effects settle once, when it ends.",
    code: "batch(() => { … })",
  },
  {
    label: "Lists",
    title: "Keyed rows with .map()",
    text: "Rows are keyed by the items themselves. A push inserts one row, and a sort moves the existing nodes.",
    code: "todos.map((todo) => <li />)",
  },
  {
    label: "Compiler",
    title: "JSX, compiled",
    text: "Static markup becomes a template cloned with cloneNode(true), and each .value read becomes its own binding.",
    code: "selected.value === todo.id",
  },
  {
    label: "Tooling",
    title: "TypeScript, Vite, esbuild",
    text: "Typed states and JSX, a Vite plugin and an esbuild plugin. SVG files import as components.",
    code: 'import qwrk from "qwrk-vite"',
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
  <div class="q-landing">
    <section class="q-hero">
      <div class="q-aurora" aria-hidden="true"></div>
      <div class="q-hero__copy enter">
        <p class="q-label q-label--muted">
          Reactive &middot; No virtual DOM &middot; Compiled
        </p>
        <h1 class="q-hero__title">
          Reactive UI,<br />no re-renders<span class="q-signal">.</span>
        </h1>
        <p class="q-hero__pitch">
          Components run once. A state write updates only the text, attribute or
          row that reads it.
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
            GitHub
          </a>
        </div>
        <div class="q-install">
          <span class="q-install__prompt" aria-hidden="true">$</span>
          <code class="q-install__cmd">{{ install }}</code>
          <button
            type="button"
            class="q-install__copy"
            :aria-label="
              copied === 'hero' ? 'Copied' : 'Copy the install command'
            "
            @click="copy('hero')"
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
        <p class="q-hero__beta">
          Qwrk 0.4 is in beta:
          <code>npm i qwrk@next qwrk-vite@next</code>
          <a :href="withBase('/guide/getting-started#try-the-0-4-beta')">
            Try the beta
          </a>
        </p>
      </div>

      <div class="q-hero__code">
        <figure class="q-editor">
          <div class="q-editor__bar">
            <span class="q-editor__tab">Counter.jsx</span>
          </div>
          <pre
            class="q-editor__code"
          ><code><span v-for="(line, i) in code" :key="i" class="q-editor__line"><span v-for="([kind, text], j) in line" :key="kind === 'b' ? `b${flash}` : j" :class="['t-' + kind, kind === 'b' && flash ? 'is-flash' : '']">{{ text }}</span></span></code></pre>
          <figcaption class="q-editor__run">
            <button type="button" class="q-demo" @click="bump">
              clicked
              <span
                :key="flash"
                :class="['q-demo__n', flash ? 'is-flash' : '']"
                >{{ clicks }}</span
              >
              times
            </button>
            <span class="q-editor__note">
              Only <code>{count}</code> updates. The component never runs again.
            </span>
          </figcaption>
        </figure>
      </div>
    </section>

    <section class="q-how">
      <div class="q-how__intro">
        <p class="q-label">How it works</p>
        <h2 class="q-h2">
          One write, one update<span class="q-signal">.</span>
        </h2>
        <p class="q-lede">
          There is no render step to repeat. The work happens where a state is
          read, and the compiler wires those reads up at build time.
        </p>
      </div>
      <ol class="q-how__steps">
        <li v-for="step in steps" :key="step.title" class="q-step">
          <p class="q-label">{{ step.label }}</p>
          <div class="q-step__body">
            <h3 class="q-cell__title">{{ step.title }}</h3>
            <p class="q-cell__text">{{ step.text }}</p>
          </div>
          <code class="q-step__code">{{ step.code }}</code>
        </li>
      </ol>
    </section>

    <section class="q-head">
      <p class="q-label">Features</p>
      <h2 class="q-h2">
        A small core, and sharp tools<span class="q-signal">.</span>
      </h2>
      <p class="q-lede">
        Reactive state, derives, effects and keyed lists in the runtime. The
        rest happens in the compiler, before your code ships.
      </p>
    </section>

    <div class="q-grid q-grid--3">
      <article v-for="feature in features" :key="feature.title" class="q-cell">
        <p class="q-label">{{ feature.label }}</p>
        <h3 class="q-cell__title">{{ feature.title }}</h3>
        <p class="q-cell__text">{{ feature.text }}</p>
        <code class="q-cell__code">{{ feature.code }}</code>
      </article>
    </div>

    <section class="q-start">
      <div class="q-start__copy">
        <h2 class="q-h2">
          Start with one command<span class="q-signal">.</span>
        </h2>
        <p class="q-lede">
          create-qwrk-app sets up a Vite project with the compiler already in
          place, in JavaScript or TypeScript, and prints the next steps for your
          package manager.
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
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path :fill="logos[m.name].color" :d="logos[m.name].path" />
              </svg>
              {{ m.name }}
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
  overflow-x: clip;
}

.q-hero {
  position: relative;
  isolation: isolate;
  display: grid;
  overflow: hidden;
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
  inset: -10px;
  z-index: -1;
  pointer-events: none;
  background-image: var(--q-stripes), var(--q-rainbow);
  background-size: 300%, 200%;
  background-position:
    50% 50%,
    50% 50%;
  filter: blur(10px) opacity(50%) saturate(200%);
  -webkit-mask-image: radial-gradient(
    ellipse at 100% 0%,
    black 40%,
    transparent 70%
  );
  mask-image: radial-gradient(ellipse at 100% 0%, black 40%, transparent 70%);
}

.q-aurora::after {
  content: "";
  position: absolute;
  inset: 0;
  background-image: var(--q-stripes), var(--q-rainbow);
  background-size: 200%, 100%;
  background-attachment: fixed;
  mix-blend-mode: difference;
  animation: q-aurora 60s linear infinite;
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
    padding: 104px 24px 104px 48px;
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
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  max-width: 380px;
  height: 46px;
  padding: 0 6px 0 16px;
  border: 1px solid var(--q-border);
  border-radius: 8px;
  background: rgb(15 14 13 / 0.45);
  -webkit-backdrop-filter: blur(12px);
  backdrop-filter: blur(12px);
  font-family: var(--vp-font-family-mono);
  font-size: 13.5px;
  text-align: left;
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
    padding: 64px 48px 64px 24px;
  }
}

.q-editor {
  margin: 0;
  border: 1px solid rgb(246 245 244 / 0.1);
  background: rgb(19 18 17 / 0.55);
  -webkit-backdrop-filter: blur(20px) saturate(140%);
  backdrop-filter: blur(20px) saturate(140%);
}

.q-editor__bar {
  display: flex;
  border-bottom: 1px solid var(--q-border);
}

.q-editor__tab {
  margin-bottom: -1px;
  padding: 10px 18px 9px;
  border-right: 1px solid var(--q-border);
  border-bottom: 1px solid var(--q-accent);
  background: transparent;
  font-family: var(--vp-font-family-mono);
  font-size: 12.5px;
  color: var(--q-fg);
}

.q-editor__code {
  margin: 0;
  padding: 18px 20px 20px 0;
  overflow-x: auto;
  counter-reset: line;
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  line-height: 1.75;
  color: #d8d4cf;
  tab-size: 2;
}

@media (min-width: 640px) {
  .q-editor__code {
    font-size: 13px;
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
.t-b {
  color: var(--q-fg);
}

.t-b {
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

.q-editor__run {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 16px;
  padding: 14px 18px;
  border-top: 1px solid var(--q-border);
  background: rgb(15 14 13 / 0.35);
}

.q-editor__note {
  font-size: 13px;
  line-height: 1.5;
  color: var(--q-muted);
}

.q-editor__note code {
  font-family: var(--vp-font-family-mono);
  font-size: 12.5px;
  color: var(--q-fg);
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

.q-how {
  display: grid;
  gap: 1px;
  border-bottom: 1px solid var(--q-border);
  background: var(--q-border);
}

@media (min-width: 1024px) {
  .q-how {
    grid-template-columns: minmax(0, 7fr) minmax(0, 6fr);
  }
}

.q-how__intro {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 16px;
  padding: 56px 20px;
  background: var(--q-bg);
}

@media (min-width: 640px) {
  .q-how__intro {
    padding: 64px 40px;
  }
}

@media (min-width: 1024px) {
  .q-how__intro {
    padding: 88px 48px;
  }
}

.q-how__steps {
  display: grid;
  gap: 1px;
  margin: 0;
  padding: 0;
  list-style: none;
  background: var(--q-border);
}

.q-step {
  display: grid;
  gap: 10px;
  padding: 28px 20px;
  background: var(--q-bg);
}

@media (min-width: 640px) {
  .q-step {
    grid-template-columns: 120px minmax(0, 1fr);
    gap: 10px 24px;
    padding: 32px 40px;
  }

  .q-step .q-label {
    padding-top: 6px;
  }

  .q-step__code {
    grid-column: 2;
  }
}

@media (min-width: 1024px) {
  .q-step {
    padding: 36px 48px;
  }
}

.q-step__body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.q-step__body .q-cell__title {
  margin: 0;
}

.q-step__code {
  font-family: var(--vp-font-family-mono);
  font-size: 12.5px;
  color: var(--q-fg);
  overflow-wrap: anywhere;
}

.q-head {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 16px;
  padding: 56px 20px;
  border-bottom: 1px solid var(--q-border);
}

@media (min-width: 640px) {
  .q-head {
    padding: 64px 40px;
  }
}

@media (min-width: 1024px) {
  .q-head {
    padding: 88px 48px 72px;
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

.q-grid {
  display: grid;
  gap: 1px;
  border-bottom: 1px solid var(--q-border);
  background: var(--q-border);
}

@media (min-width: 768px) {
  .q-grid--3 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 1024px) {
  .q-grid--3 {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.q-cell {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 32px 20px;
  background: var(--q-bg);
}

@media (min-width: 640px) {
  .q-cell {
    padding: 36px 40px;
  }
}

@media (min-width: 1024px) {
  .q-cell {
    padding: 40px 48px 44px;
  }
}

.q-cell__title {
  margin: 4px 0 0;
  font-size: 21px;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.025em;
  color: var(--q-fg);
}

.q-cell__text {
  flex: 1;
  margin: 0;
  font-size: 14.5px;
  line-height: 1.6;
  color: var(--q-muted);
}

.q-cell__code {
  margin-top: 10px;
  padding-top: 14px;
  border-top: 1px solid var(--q-border);
  font-family: var(--vp-font-family-mono);
  font-size: 12.5px;
  color: var(--q-fg);
  overflow-wrap: anywhere;
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
  min-width: 0;
  border: 1px solid var(--q-border);
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
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-bottom: -1px;
  padding: 10px 16px 9px;
  border-right: 1px solid var(--q-border);
  border-bottom: 1px solid transparent;
  font-family: var(--vp-font-family-mono);
  font-size: 12.5px;
  color: var(--q-muted);
  transition: color 0.15s;
}

.q-term__tab svg {
  width: 14px;
  height: 14px;
  flex: none;
}

.q-term__tab:hover {
  color: var(--q-fg);
}

.q-term__tab[aria-pressed="true"] {
  border-bottom-color: var(--q-accent);
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
