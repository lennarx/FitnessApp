import path from "node:path";
import { defineConfig } from "vitest/config";

// Phase 3 adds vitest for pure helpers only (parseLoad) — no jsdom, no UI
// testing. lib/**/*.test.ts is the only included pattern on purpose.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    include: ["lib/**/*.test.ts"],
    environment: "node",
  },
});
