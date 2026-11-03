import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // The emulator-based security-rules tests have their own command: npm run test:rules
    exclude: ["tests/rules/**", "node_modules/**"],
  },
});
