import tailwind from "bun-plugin-tailwind";

// the CLI can't load plugins, and the options page needs Tailwind's
const result = await Bun.build({
	entrypoints: ["./options.html"],
	outdir: "out",
	minify: true,
	sourcemap: "linked",
	naming: { chunk: "[name].[ext]", asset: "[name].[ext]" },
	// without it React ships its much larger development build
	define: { "process.env.NODE_ENV": JSON.stringify("production") },
	plugins: [tailwind],
});
if (!result.success) {
	for (const log of result.logs) {
		console.error(log);
	}
	process.exit(1);
}
