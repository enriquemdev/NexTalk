import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
export default defineConfig({
  plugins: [react()],
  test: { environment: "node", setupFiles: ["./src/test/setup.ts"], include: ["convex/**/*.test.ts", "src/**/*.test.{ts,tsx}"], globals: true },
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)), "convex/_generated": fileURLToPath(new URL("./convex/_generated", import.meta.url)) } },
});
