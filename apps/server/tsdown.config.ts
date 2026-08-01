import { defineConfig } from "tsdown";

export default defineConfig({
  clean: true,
  deps: {
    alwaysBundle: [/./],
    onlyBundle: false
  },
  dts: true,
  entry: "./src/index.ts",
  format: "esm",
  minify: true,
  outDir: "./.output",
  sourcemap: true
});
