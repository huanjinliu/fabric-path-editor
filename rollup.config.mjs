import resolve from "@rollup/plugin-node-resolve";
import babel from "@rollup/plugin-babel";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";
import json from "@rollup/plugin-json";
import serve from "rollup-plugin-serve";
import livereload from "rollup-plugin-livereload";
import peerDepsExternal from 'rollup-plugin-peer-deps-external';
import terser from '@rollup/plugin-terser';

const config = {
  input: "src/index.ts",
  output: [
    {
      file: "public/index.js",
      format: "umd",
      name: "FabricPathEditor",
      globals: {
        fabric: 'fabric'
      }
    },
  ],
  plugins: [
    resolve(),
    peerDepsExternal(),
    commonjs(),
    json(),
    typescript({
      declaration: false,
    }),
    babel({
      babelHelpers: "bundled",
    }),
    terser()
  ],
};

if (process.env.ENV === "dev") {
  config.plugins.push(
    serve({
      open: true,
      contentBase: "public/",
      port: 8080,
      verbose: true,
    }),
    livereload({
      watch: ["public"],
      verbose: false,
    })
  );
}

export default config;
