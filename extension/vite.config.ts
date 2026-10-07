import adapter from "@sveltejs/adapter-static";
import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { externalStartScript } from "./start-script.ts";
import { svelteOptions } from "./svelte-options.ts";

const pages = "out";

export default defineConfig({
    plugins: [
        tailwindcss(),
        sveltekit({
            ...svelteOptions,
            adapter: externalStartScript(adapter({ pages }), pages),
            // chrome refuses to load an extension with a folder starting with an underscore
            appDir: "app",
        }),
    ],
    build: {
        target: "esnext",
        sourcemap: true,
    },
});
