import { svelte } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, type HtmlTagDescriptor } from "vite";
import { copy } from "./src/copy.ts";

export default defineConfig({
    plugins: [
        tailwindcss(),
        svelte(),
        {
            // in the served html rather than set by script, for link previews
            name: "page-head",
            transformIndexHtml: (): HtmlTagDescriptor[] => [
                { tag: "title", children: copy.pageTitle, injectTo: "head" },
                {
                    tag: "meta",
                    attrs: {
                        name: "description",
                        content: copy.pageDescription,
                    },
                    injectTo: "head",
                },
            ],
        },
    ],
});
