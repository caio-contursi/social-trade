import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    environment: "jsdom",
    environmentOptions: { jsdom: { url: "http://localhost:3000" } },
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    clearMocks: true,
    coverage: {
      provider: "v8",
      thresholds: { lines: 95, statements: 95, branches: 90, functions: 90 },
      reporter: [["text", { skipFull: false }], "json-summary", "lcov", "html"],
      include: [
        "src/lib/api-origin.ts",
        "src/components/auth-provider.tsx",
        "src/components/auth/validation.ts",
        "src/components/auth/login-form.tsx",
        "src/lib/api.ts",
        "src/lib/catalog.ts",
      ],
    },
  },
});
