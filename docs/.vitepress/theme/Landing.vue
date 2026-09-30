<script setup lang="ts">
import { withBase } from "vitepress";
import { onBeforeUnmount, ref } from "vue";
import BenchmarkGrid from "./BenchmarkGrid.vue";

const install = "npm create qwrk-app@latest";
const github = "https://github.com/Srinath10X/qwrk";
const copied = ref(false);
let reset: ReturnType<typeof setTimeout> | undefined;

async function copy() {
  await navigator.clipboard.writeText(install);
  copied.value = true;
  clearTimeout(reset);
  reset = setTimeout(() => (copied.value = false), 1800);
}

onBeforeUnmount(() => clearTimeout(reset));

const compiled = [
  {
    label: "Template",
    text: "Static markup is parsed once, then copied with cloneNode(true).",
  },
  {
    label: "Binding",
    text: "Reading count.value in JSX re-runs only that text node.",
  },
  {
    label: "Selection",
    text: "selected.value === todo.id becomes a keyed check: two rows update, not a thousand.",
  },
];

const features = [
  {
    label: "State",
    title: "Fine-grained state",
    text: "state() holds a value. Arrays and objects notify when changed in place, and only what reads them updates.",
    code: "todos.value.push(todo)",
  },
  {
    label: "Compiler",
    title: "Templates, cloned",
    text: "qwrk-vite turns JSX into templates copied with cloneNode, and binds the dynamic parts. Any .value read in JSX stays live.",
    code: "cloneNode(true)",
  },
  {
    label: "Lists",
    title: "Keyed rows with .map()",
    text: "Rows are keyed by the items themselves. A push inserts one row, a sort moves the existing nodes.",
    code: "todos.map((todo) => <li />)",
  },
  {
    label: "Updates",
    title: "batch() and glitch-free derives",
    text: "A derive recomputes once per change, after the derives it reads. batch() turns several writes into one update.",
    code: "batch(() => { … })",
  },
  {
    label: "Size",
    title: "4.7 KB compressed",
    text: "The js-framework-benchmark app builds to 4.7 KB compressed. Lists and the compiler helpers ship only when used.",
    code: "4.7 KB",
  },
  {
    label: "DOM",
    title: "No virtual DOM",
    text: "Components run once and return real nodes. Nothing diffs a tree: a write goes to the node that reads it.",
    code: "append(<App />)",
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
      <div class="q-rays" aria-hidden="true" />
      <div class="q-hero__inner enter">
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
        <div class="q-hero__actions">
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
            :aria-label="copied ? 'Copied' : 'Copy install command'"
            @click="copy"
          >
            <svg v-if="!copied" viewBox="0 0 24 24" aria-hidden="true">
              <rect x="8.5" y="8.5" width="12" height="12" rx="2" />
              <path
                d="M15.5 8.5v-3a2 2 0 0 0-2-2h-8a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3"
              />
            </svg>
            <svg v-else viewBox="0 0 24 24" aria-hidden="true">
              <path d="m5 12.5 4.5 4.5L19 7.5" />
            </svg>
          </button>
          <span class="visually-hidden" aria-live="polite">{{
            copied ? "Copied to clipboard" : ""
          }}</span>
        </div>
        <p class="q-hero__beta">
          <span class="q-pill">0.4 beta</span>
          <code>npm i qwrk@next qwrk-vite@next</code>
        </p>
      </div>
    </section>

    <section class="q-split">
      <div class="q-split__copy">
        <p class="q-label">Code</p>
        <h2 class="q-h2">Plain JSX, compiled<span class="q-signal">.</span></h2>
        <p class="q-lede">
          Write components the way you already do. The compiler keeps the markup
          static and wires each <code>.value</code> read to the exact node that
          shows it.
        </p>
        <dl class="q-facts">
          <div v-for="fact in compiled" :key="fact.label" class="q-facts__row">
            <dt class="q-label">{{ fact.label }}</dt>
            <dd>{{ fact.text }}</dd>
          </div>
        </dl>
      </div>
      <div class="q-split__code">
        <div class="q-panel">
          <div class="q-panel__bar">
            <span class="q-panel__dots" aria-hidden="true"
              ><i /><i /><i
            /></span>
            <span class="q-label">src/App.jsx</span>
          </div>
          <div class="q-panel__body vp-doc">
            <slot name="code" />
          </div>
        </div>
      </div>
    </section>

    <section class="q-head">
      <p class="q-label">Why Qwrk</p>
      <h2 class="q-h2">
        A small core that does less work<span class="q-signal">.</span>
      </h2>
      <p class="q-lede">
        No component re-renders and no tree to diff. State, derives and effects
        track exactly what they read, and the compiler does the rest at build
        time.
      </p>
    </section>

    <div class="q-grid">
      <article v-for="feature in features" :key="feature.title" class="q-cell">
        <p class="q-label">{{ feature.label }}</p>
        <h3 class="q-cell__title">{{ feature.title }}</h3>
        <p class="q-cell__text">{{ feature.text }}</p>
        <code class="q-cell__code">{{ feature.code }}</code>
      </article>
    </div>

    <section class="q-head">
      <p class="q-label">Benchmarks</p>
      <h2 class="q-h2">Closest to vanilla JS<span class="q-signal">.</span></h2>
      <p class="q-lede">
        js-framework-benchmark, keyed. Chromium 154 on a 4-core Codespace, every
        framework in the same session, median of 5 runs, Qwrk at
        <code>324918e</code>. Lower is better.
      </p>
      <a class="q-more" :href="withBase('/guide/benchmarks')">
        How it was measured
        <span aria-hidden="true">&rarr;</span>
      </a>
    </section>

    <BenchmarkGrid class="q-bench-block" />

    <section class="q-cta">
      <h2 class="q-h2">
        Start with one command<span class="q-signal">.</span>
      </h2>
      <div class="q-hero__actions">
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
  place-items: center;
  padding: 72px 20px 76px;
  border-bottom: 1px solid var(--q-border);
  text-align: center;
}

@media (min-width: 640px) {
  .q-hero {
    padding: 96px 32px;
  }
}

@media (min-width: 1024px) {
  .q-hero {
    padding: 128px 64px 136px;
  }
}

.q-rays {
  position: absolute;
  inset: -64px 0 0;
  z-index: -1;
  overflow: hidden;
  pointer-events: none;
}

.q-rays::before,
.q-rays::after {
  content: "";
  position: absolute;
  left: 50%;
  top: 0;
  translate: -50% 0;
}

.q-rays::before {
  width: 1400px;
  height: 900px;
  background: conic-gradient(
    from 180deg at 50% 0%,
    transparent 0deg 5deg,
    rgb(137 180 250 / 0.12) 8deg,
    transparent 11deg 16deg,
    rgb(137 180 250 / 0.2) 20deg,
    transparent 24deg 30deg,
    rgb(137 180 250 / 0.1) 34deg,
    transparent 39deg 321deg,
    rgb(137 180 250 / 0.1) 326deg,
    transparent 330deg 336deg,
    rgb(137 180 250 / 0.2) 340deg,
    transparent 344deg 349deg,
    rgb(137 180 250 / 0.12) 352deg,
    transparent 355deg
  );
  filter: blur(14px);
  mask-image: radial-gradient(
    ellipse 50% 78% at 50% 0%,
    #000 20%,
    transparent 80%
  );
}

.q-rays::after {
  width: 900px;
  height: 420px;
  background: radial-gradient(
    ellipse 50% 60% at 50% 0%,
    rgb(137 180 250 / 0.16),
    transparent 70%
  );
}

.q-hero__inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 22px;
  width: 100%;
  max-width: 780px;
}

.q-hero__title {
  margin: 0;
  font-size: 44px;
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.045em;
  color: var(--q-fg);
  text-wrap: balance;
}

@media (min-width: 640px) {
  .q-hero__title {
    font-size: 64px;
  }
}

@media (min-width: 1024px) {
  .q-hero__title {
    font-size: 88px;
  }
}

.q-hero__pitch {
  max-width: 46ch;
  margin: 0;
  font-size: 15px;
  line-height: 1.65;
  color: var(--q-muted);
  text-wrap: pretty;
}

@media (min-width: 1024px) {
  .q-hero__pitch {
    font-size: 18px;
  }
}

.q-hero__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
  margin-top: 10px;
}

.q-install {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  max-width: 360px;
  margin-top: 6px;
  padding: 0 6px 0 16px;
  height: 46px;
  border: 1px solid var(--q-border);
  border-radius: 8px;
  background: rgb(15 14 13 / 0.6);
  backdrop-filter: blur(6px);
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
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin: 0;
  font-size: 13px;
  color: var(--q-muted);
}

.q-hero__beta code {
  font-family: var(--vp-font-family-mono);
  font-size: 12.5px;
  color: var(--q-muted);
}

.q-split {
  display: grid;
  gap: 1px;
  border-bottom: 1px solid var(--q-border);
  background: var(--q-border);
}

@media (min-width: 1024px) {
  .q-split {
    grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
  }
}

.q-split__copy,
.q-split__code {
  background: var(--q-bg);
}

.q-split__copy {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 56px 24px;
}

@media (min-width: 640px) {
  .q-split__copy {
    padding: 64px 40px;
  }
}

@media (min-width: 1024px) {
  .q-split__copy {
    padding: 80px 48px;
  }
}

.q-split__code {
  display: grid;
  align-items: center;
  padding: 24px 16px;
  background:
    radial-gradient(
      ellipse 70% 60% at 70% 30%,
      rgb(137 180 250 / 0.06),
      transparent 70%
    ),
    var(--q-bg);
}

@media (min-width: 640px) {
  .q-split__code {
    padding: 48px 40px;
  }
}

@media (min-width: 1024px) {
  .q-split__code {
    padding: 56px 48px;
  }
}

.q-h2 {
  margin: 0;
  font-size: clamp(28px, 3.2vw, 40px);
  font-weight: 700;
  line-height: 1.06;
  letter-spacing: -0.03em;
  color: var(--q-fg);
  text-wrap: balance;
}

.q-lede {
  max-width: 60ch;
  margin: 0;
  font-size: 16px;
  line-height: 1.65;
  color: var(--q-muted);
  text-wrap: pretty;
}

.q-lede code,
.q-facts code {
  font-family: var(--vp-font-family-mono);
  font-size: 0.88em;
  color: var(--q-fg);
}

.q-facts {
  display: flex;
  flex-direction: column;
  margin: 12px 0 0;
}

.q-facts__row {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 16px 0;
  border-top: 1px solid var(--q-border);
}

.q-facts__row dd {
  margin: 0;
  font-size: 14.5px;
  line-height: 1.55;
  color: var(--q-muted);
}

.q-panel {
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--q-border);
  border-radius: 10px;
  background: var(--q-code);
  box-shadow: 0 24px 48px -24px rgb(0 0 0 / 0.7);
}

.q-panel__bar {
  display: flex;
  align-items: center;
  gap: 16px;
  height: 40px;
  padding: 0 16px;
  border-bottom: 1px solid var(--q-border);
}

.q-panel__dots {
  display: flex;
  gap: 6px;
}

.q-panel__dots i {
  width: 9px;
  height: 9px;
  border: 1px solid #3b3935;
  border-radius: 50%;
}

.q-panel__body :deep(div[class*="language-"]) {
  margin: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
}

.q-panel__body :deep(span.lang) {
  display: none;
}

.q-panel__body :deep(pre) {
  padding: 18px 0 20px;
}

.q-panel__body :deep(code) {
  font-size: 12px;
}

@media (min-width: 640px) {
  .q-panel__body :deep(code) {
    font-size: 13.5px;
  }
}

@media (max-width: 639px) {
  .q-panel__body :deep(pre) {
    padding: 16px 0 18px;
  }

  .q-panel__body :deep(pre code) {
    padding: 0 16px;
  }
}

.q-head {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 16px;
  padding: 56px 24px;
  border-bottom: 1px solid var(--q-border);
}

@media (min-width: 640px) {
  .q-head {
    padding: 64px 40px;
  }
}

@media (min-width: 1024px) {
  .q-head {
    padding: 80px 48px;
  }
}

.q-more {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
  font-size: 14.5px;
  font-weight: 500;
  color: var(--q-fg);
  text-decoration: underline;
  text-decoration-color: var(--q-border);
  text-underline-offset: 5px;
  transition: text-decoration-color 0.15s;
}

.q-more:hover {
  text-decoration-color: var(--q-accent);
}

.q-grid {
  display: grid;
  gap: 1px;
  border-bottom: 1px solid var(--q-border);
  background: var(--q-border);
}

@media (min-width: 768px) {
  .q-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 1024px) {
  .q-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.q-cell {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 32px 24px;
  background: var(--q-bg);
}

@media (min-width: 1024px) {
  .q-cell {
    padding: 40px 36px;
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
  align-self: flex-start;
  margin-top: 8px;
  padding: 5px 9px;
  border: 1px solid var(--q-border);
  border-radius: 6px;
  font-family: var(--vp-font-family-mono);
  font-size: 12.5px;
  color: var(--q-fg);
}

.q-bench-block {
  border-bottom: 1px solid var(--q-border);
}

.q-cta {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  padding: 72px 24px;
  border-bottom: 1px solid var(--q-border);
  text-align: center;
}

@media (min-width: 1024px) {
  .q-cta {
    padding: 96px 48px;
  }
}

.q-footer {
  display: grid;
  gap: 20px;
  padding: 32px 24px 40px;
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
