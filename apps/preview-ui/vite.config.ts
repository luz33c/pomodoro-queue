import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// web 3000, app 3002, desktop 3003
const PORT = 3004;

export default defineConfig({
  server: {
    port: PORT,
    strictPort: true
  },
  preview: {
    port: PORT,
    strictPort: true
  },
  plugins: [
    // Server-renders the gallery; routes opt out with `ssr: false`
    tanstackStart(),
    viteReact(),
    /** @see {@link https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md#react-compiler} */
    babel({
      presets: [reactCompilerPreset()]
    }),
    tailwindcss()
  ]
});
