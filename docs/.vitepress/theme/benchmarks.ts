/**
 * js-framework-benchmark results, keyed implementations. Every framework ran
 * in the same session: Chromium 154 on a 4-core Codespace, median of 5 runs,
 * Qwrk at commit 324918e. Lower is better everywhere.
 */
export const frameworks = ["Qwrk", "Solid", "Svelte 5", "React 19"];

export interface Metric {
  title: string;
  note: string;
  unit: string;
  digits: number;
  /** One value per framework, in the order of {@link frameworks}. */
  values: number[];
  /** Where vanilla JS sits, for metrics measured against it. */
  baseline?: number;
}

export const overall: Metric = {
  title: "Overall",
  note: "Geometric mean of every keyed benchmark, relative to vanilla JS",
  unit: "×",
  digits: 3,
  values: [1.06, 1.122, 1.201, 1.775],
  baseline: 1,
};

export const metrics: Metric[] = [
  {
    title: "Memory",
    note: "With 1,000 rows",
    unit: " MB",
    digits: 2,
    values: [2.25, 2.68, 2.87, 4.42],
  },
  {
    title: "First paint",
    note: "App startup",
    unit: " ms",
    digits: 0,
    values: [107, 115, 125, 443],
  },
  {
    title: "Select row",
    note: "Highlight one row of 1,000",
    unit: "×",
    digits: 2,
    values: [1.07, 1.21, 1.87, 2.41],
  },
];

/** The value of a metric as the results table shows it. */
export function format(metric: Metric, value: number) {
  return `${value.toFixed(metric.digits)}${metric.unit}`;
}
