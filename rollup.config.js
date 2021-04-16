import typescript from "@rollup/plugin-typescript";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import replace from "@rollup/plugin-replace";

export default [
  {
    input: "src/convert.ts",
    output: {
      file: "dist/convert.bundle.js",
      format: "iife",
    },
    plugins: [
      typescript({
        types: ["chrome"],
        include: ["src/convert.ts", "lib/**/*.ts"],
      }),
    ],
  },
  {
    input: "src/worker.ts",
    output: {
      file: "service_worker.js",
      format: "iife",
    },
    plugins: [
      typescript({
        types: ["chrome"],
        include: ["src/worker.ts"],
      }),
    ],
  },
  {
    input: "src/options.tsx",
    output: {
      file: "dist/options.bundle.js",
      format: "iife",
    },
    plugins: [
      replace({
        preventAssignment: true,
        "process.env.NODE_ENV": JSON.stringify("production"),
      }),
      typescript({
        types: ["chrome"],
        include: ["src/options.tsx", "lib/**/*.ts", "lib/**/*.tsx"],
      }),
      commonjs(),
      nodeResolve(),
    ],
  },
];
