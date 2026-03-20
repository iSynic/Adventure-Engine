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
    outDir: path.resolve(import.meta.dirname, "public", "launcher-runtime"),
    emptyOutDir: true,
    lib: {
      entry: path.resolve(import.meta.dirname, "src/runtime/launcherBoot.ts"),
      formats: ["iife"],
      name: "AdventureRuntime",
      fileName: () => "runtime.js",
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
