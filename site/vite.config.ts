import adapter from "@sveltejs/adapter-static";
import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { svelteOptions } from "../extension/svelte-options.ts";

export default defineConfig({
    plugins: [
        tailwindcss(),
        sveltekit({ ...svelteOptions, adapter: adapter({ pages: "dist" }) }),
    ],
});
