import { defineConfig } from "tsup";

export default defineConfig({
  // entry: ["src/index.js"],
  // splitting: false,
  // sourcemap: true,
  // clean: true,

  entry: ["src/index.js", "src/index.client.js"],
  format: ['esm'],
  target: 'node20',
  dts: true,
  clean: true,
  sourcemap: true
});
