import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    // Run tests that are inside the src folder
    include: ["src/**/*.test.{js,ts,jsx,tsx}"],
    environment: "node",
  },
});