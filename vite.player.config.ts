import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  publicDir: false,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "public", "player-runtime"),
    emptyOutDir: true,
    lib: {
      entry: path.resolve(import.meta.dirname, "src/runtime/standalone-player.ts"),
      formats: ["iife"],
      name: "AdventurePlayer",
      fileName: () => "player.js",
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
    minify: "esbuild",
    sourcemap: false,
  },
});
