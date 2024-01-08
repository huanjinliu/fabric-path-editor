import resolve from '@rollup/plugin-node-resolve';
import babel from '@rollup/plugin-babel';
import commonjs from '@rollup/plugin-commonjs';
import clear from 'rollup-plugin-clear';
import peerDepsExternal from 'rollup-plugin-peer-deps-external';
import { terser } from 'rollup-plugin-terser';
import typescript from '@rollup/plugin-typescript';
import pkg from '../package.json' assert { type: 'json' };

const config = {
  input: 'src/index.ts',
  output: [
    {
      file: pkg.brower,
      format: 'umd',
      name: 'fabricPathEditor',
      globals: {
        fabric: 'fabric'
      }
    },
    {
      file: pkg.module,
      format: 'esm',
    },
  ],
  plugins: [
    clear({
      targets: ['dist'],
      watch: process.env.ROLLUP_WATCH === 'true',
    }),
    peerDepsExternal(),
    resolve(),
    typescript(),
    babel({
      babelHelpers: 'bundled',
    }),
    commonjs(),
  ],
};

if (process.env.NODE_ENV !== 'development') {
  config.plugins.push(terser());
}

export default config;
