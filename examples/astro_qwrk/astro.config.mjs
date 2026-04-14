// @ts-check
import { defineConfig } from "astro/config";
import qwrk from "qwrk-vite";

// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [qwrk()],
  },
});
