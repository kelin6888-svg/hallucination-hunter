import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  cacheDir: ".vite-cache",
  server: {
    host: "127.0.0.1",
    port: 4176,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: "127.0.0.1",
    port: 4176,
    strictPort: true,
  },
  build: {
    outDir: "dist",
    chunkSizeWarningLimit: 1200,
  },
});
