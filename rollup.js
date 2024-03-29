import fs from "fs";
import glob from "glob";
import path from "path";
import typescript from "@rollup/plugin-typescript";

import packageJson from "./package.json";

const allNodeTypes = Object.keys(packageJson["node-red"].nodes);

const htmlWatch = () => {
  return {
    name: "htmlWatch",
    load(id) {
      const editorDir = path.dirname(id);
      const htmlFiles = glob.sync(path.join(editorDir, "*.html"));
      htmlFiles.map((file) => this.addWatchFile(file));
    },
  };
};

const htmlBundle = () => {
  return {
    name: "htmlBundle",
    renderChunk(code, chunk, _options) {
      const editorDir = path.dirname(chunk.facadeModuleId);
      const htmlFiles = glob.sync(path.join(editorDir, "*.html"));
      const htmlContents = htmlFiles.map((fPath) => fs.readFileSync(fPath));

      code =
        '<script type="text/javascript">\n' +
        code +
        "\n" +
        "</script>\n" +
        htmlContents.join("\n");

      return {
        code,
        map: { mappings: "" },
      };
    },
  };
};

const makePlugins = (nodeType) => [
  htmlWatch(),
  typescript({
    lib: ["es6", "dom"],
    include: [
      `src/nodes/${nodeType}.html/*.ts`,
      `src/nodes/systemair_types.ts`,
      `src/nodes/systemair_registers.ts`,
    ],
    target: "es2018",
    tsconfig: false,
    noEmitOnError: process.env.ROLLUP_WATCH ? false : true,
  }),
  htmlBundle(),
];

const makeConfigItem = (nodeType) => ({
  input: `src/nodes/${nodeType}.html/index.ts`,
  output: {
    file: `dist/nodes/${nodeType}.html`,
    format: "iife",
  },
  plugins: makePlugins(nodeType),
  watch: {
    clearScreen: false,
  },
});

export default allNodeTypes.flatMap((nodeType) => [makeConfigItem(nodeType)]);
