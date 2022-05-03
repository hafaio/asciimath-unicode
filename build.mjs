import { pnpPlugin } from "@yarnpkg/esbuild-plugin-pnp";
import { build } from "esbuild";
import { performance } from "perf_hooks";
import chalk from "chalk";
import { stat } from "node:fs/promises";
import { parse } from "node:path";

const start = performance.now();

async function wrapper(options) {
  const res = await build(options);
  const { outfile } = options;
  const { size } = await stat(outfile);
  const { dir, base } = parse(outfile);
  console.log(
    chalk.white(`\n  ${dir}/`) + chalk.bold(`${base}`),
    chalk.cyan(` ${(size / 1024).toFixed(1)}kb`)
  );
  return res;
}

const config = {
  plugins: [pnpPlugin()],
  bundle: true,
  minify: true,
};

await Promise.all([
  wrapper({
    ...config,
    entryPoints: ["src/worker.ts"],
    outfile: "service_worker.js",
  }),
  wrapper({
    ...config,
    entryPoints: ["src/convert.ts"],
    outfile: "convert.js",
  }),
]);

const elapsed = Math.round(performance.now() - start);
console.log("\n⚡", chalk.green(`Done in ${elapsed}ms`));
