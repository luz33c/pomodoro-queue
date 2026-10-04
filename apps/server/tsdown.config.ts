import { defineConfig } from "tsdown";

export default defineConfig({
  clean: true,
  deps: {
    alwaysBundle: [/./],
    onlyBundle: false
  },
  // This is an application bundle run via `node .output/index.mjs`; nothing consumes
  // its type declarations. Emitting them also fails under TypeScript 7's experimental
  // declaration emit for the workspace packages bundled in via `alwaysBundle`.
  dts: false,
  entry: "./src/index.ts",
  format: "esm",
  minify: true,
  outDir: "./.output",
  sourcemap: true
});
