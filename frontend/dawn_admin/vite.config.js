import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    fs: { allow: [fileURLToPath(new URL("../../", import.meta.url))] },
    proxy: { "/api": "http://127.0.0.1:4000" },
  },
});
