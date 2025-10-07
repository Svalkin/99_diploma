/* eslint-disable node/no-unpublished-require */

const svelte = require("rollup-plugin-svelte");
const { default: resolve } = require("@rollup/plugin-node-resolve");
const commonjs = require("@rollup/plugin-commonjs");
const { babel } = require("@rollup/plugin-babel");
const livereload = require("rollup-plugin-livereload");
const { terser } = require("rollup-plugin-terser");
const css = require("rollup-plugin-css-only");

const production = !process.env.ROLLUP_WATCH;

module.exports = {
  input: "frontend-src/main.js",
  output: {
    sourcemap: true,
    format: "iife",
    name: "app",
    file: "public/bundle.js",
    globals: {
      'date-fns/parseISO': '_parseDate',
      'date-fns/format': '_formatDate',
      'easymde': 'EasyMDE'
    }
  },
  plugins: [
    svelte({
      compilerOptions: {
        dev: !production,
      },
    }),

    css({ output: "bundle.css" }),

    babel({
      extensions: [".js", ".mjs", ".svelte"],
      babelHelpers: "runtime",
      include: ["src/**", "node_modules/svelte/**"],
    }),

    resolve({
      browser: true,
      dedupe: ["svelte"],
      modulesOnly: false // 👈 Разрешает импорт из node_modules
    }),

    commonjs(),

    !production && livereload("public"),

    production && terser(),
  ],
  watch: {
    clearScreen: false,
  },
};