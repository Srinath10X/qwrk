import type { Theme } from "vitepress";
import DefaultTheme from "vitepress/theme-without-fonts";
import BenchmarkGrid from "./BenchmarkGrid.vue";
import Landing from "./Landing.vue";
import "./style.css";

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component("Landing", Landing);
    app.component("BenchmarkGrid", BenchmarkGrid);
  },
} satisfies Theme;
