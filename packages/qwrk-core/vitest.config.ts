import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "happy-dom",
    // test/memory.test.ts forces garbage collection with gc().
    execArgv: ["--expose-gc"],
  },
});
