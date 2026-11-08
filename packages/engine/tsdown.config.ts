import { defineConfig } from "tsdown";

export default defineConfig({
  entry: "src/index.ts",
  format: "esm",
  platform: "neutral",
  dts: true,
  exports: { devExports: true },
  deps: { onlyImport: [] },
  publint: true,
  attw: { profile: "esm-only" },
});
