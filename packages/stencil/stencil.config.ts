import type { Config } from "@stencil/core";

export const config: Config = {
  namespace: "wcc-stencil",
  srcDir: "src",
  outputTargets: [
    {
      type: "dist-custom-elements",
      dir: "stencil-dist",
      customElementsExportBehavior: "single-export-module",
      externalRuntime: false,
      minify: true,
    },
  ],
  extras: {
    enableImportInjection: true,
  },
  rollupConfig: {
    inputOptions: {
      external: ["@wcc/shared"],
    },
  },
};
