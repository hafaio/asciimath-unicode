import { svelte } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
    // the page is served from inside the extension, not from a site's root
    base: "./",
    plugins: [tailwindcss(), svelte()],
    build: {
        outDir: "out",
        target: "esnext",
        sourcemap: true,
        modulePreload: { polyfill: false },
        rolldownOptions: {
            input: "options.html",
            output: {
                entryFileNames: "[name].js",
                assetFileNames: "[name].[ext]",
            },
        },
    },
});
