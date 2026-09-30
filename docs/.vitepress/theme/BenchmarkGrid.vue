<script setup lang="ts">
import {
  format,
  frameworks,
  metrics,
  overall,
  type Metric,
} from "./benchmarks";

const cells = [overall, ...metrics];

/** Bar length as a share of the slowest framework, scaled from zero. */
function share(metric: Metric, value: number) {
  return `${(value / Math.max(...metric.values)) * 100}%`;
}
</script>

<template>
  <div class="q-bench">
    <div
      v-for="metric in cells"
      :key="metric.title"
      class="q-bench__cell"
      :class="{ 'q-bench__cell--wide': metric === overall }"
    >
      <div class="q-bench__head">
        <span class="q-bench__title">{{ metric.title }}</span>
        <span class="q-bench__note">{{ metric.note }}</span>
      </div>

      <ul
        class="q-bench__bars"
        :style="
          metric.baseline ? { '--base': share(metric, metric.baseline) } : {}
        "
        :aria-label="`${metric.title}, lower is better`"
      >
        <li
          v-for="(name, i) in frameworks"
          :key="name"
          class="q-bench__row"
          :class="{ 'is-qwrk': i === 0 }"
        >
          <span class="q-bench__name">{{ name }}</span>
          <span class="q-bench__track" aria-hidden="true">
            <span
              class="q-bench__fill"
              :style="{ width: share(metric, metric.values[i]) }"
            />
          </span>
          <span class="q-bench__value">{{
            format(metric, metric.values[i])
          }}</span>
        </li>
      </ul>

      <p v-if="metric.baseline" class="q-bench__legend">
        <span class="q-bench__tick" aria-hidden="true" />
        Vanilla JS at {{ format(metric, metric.baseline) }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.q-bench {
  display: grid;
  gap: 1px;
  background: var(--q-border);
}

@media (min-width: 768px) {
  .q-bench {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .q-bench__cell--wide {
    grid-column: 1 / -1;
  }
}

.q-bench__cell {
  display: flex;
  flex-direction: column;
  gap: 22px;
  padding: 28px 24px 30px;
  background: var(--q-bg);
  container-type: inline-size;
}

@media (min-width: 1024px) {
  .q-bench__cell {
    padding: 34px 36px 36px;
  }
}

.q-bench__head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 6px 16px;
}

.q-bench__title {
  font-size: 10px;
  font-weight: 600;
  line-height: 1.4;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--q-label);
}

.q-bench__note {
  font-size: 13px;
  line-height: 1.4;
  color: var(--q-muted);
}

.q-bench__bars {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.q-bench__row {
  display: grid;
  grid-template-columns: 1fr auto;
  grid-template-areas:
    "name value"
    "track track";
  align-items: baseline;
  gap: 7px 12px;
  margin: 0;
}

@container (min-width: 560px) {
  .q-bench__row {
    grid-template-columns: 96px 1fr 72px;
    grid-template-areas: "name track value";
    align-items: center;
  }
}

.q-bench__name {
  grid-area: name;
  font-size: 14px;
  font-weight: 500;
  color: var(--q-muted);
}

.q-bench__value {
  grid-area: value;
  font-size: 14px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  text-align: right;
  color: var(--q-muted);
}

.is-qwrk .q-bench__name,
.is-qwrk .q-bench__value {
  font-weight: 600;
  color: var(--q-fg);
}

.q-bench__track {
  grid-area: track;
  position: relative;
  display: block;
  height: 10px;
  background: rgb(246 245 244 / 0.035);
}

.q-bench__bars[style*="--base"] .q-bench__track::after {
  content: "";
  position: absolute;
  top: -4px;
  bottom: -4px;
  left: var(--base);
  border-left: 1px dashed color-mix(in oklab, var(--q-fg) 55%, transparent);
}

.q-bench__fill {
  display: block;
  height: 100%;
  border-radius: 1px;
  background: #4a4743;
}

.is-qwrk .q-bench__fill {
  background: linear-gradient(90deg, var(--q-accent-deep), var(--q-accent));
}

.q-bench__legend {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  font-size: 13px;
  line-height: 1.4;
  color: var(--q-muted);
}

.q-bench__tick {
  display: block;
  width: 0;
  height: 14px;
  border-left: 1px dashed color-mix(in oklab, var(--q-fg) 55%, transparent);
}
</style>
