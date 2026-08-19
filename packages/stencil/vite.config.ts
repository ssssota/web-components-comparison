import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: "register.ts",
      formats: ["es"],
      fileName: () => "index.js",
    },
    emptyOutDir: true,
    minify: true,
  },
});
