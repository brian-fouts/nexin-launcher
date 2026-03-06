import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5180,
    allowedHosts: true,
    proxy: {
      "/api": {
        target: process.env.TOWER_DEFENSE_BACKEND_URL || "http://localhost:8010",
        changeOrigin: true,
      },
      "/ws": {
        target: process.env.TOWER_DEFENSE_BACKEND_URL || "http://localhost:8010",
        ws: true,
      },
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
