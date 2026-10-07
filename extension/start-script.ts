import { readFile, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import type { Adapter } from "@sveltejs/kit";

const inlineScript = /<script>(?<code>[\s\S]*?)<\/script>/u;
const pageSuffix = /\.html$/u;

async function moveStartScript(page: string): Promise<void> {
    const html = await readFile(page, "utf8");
    const code = inlineScript.exec(html)?.groups?.["code"];
    if (code === undefined) {
        throw new Error(`${page} has no inline script to move`);
    } else {
        const script = page.replace(pageSuffix, ".start.js");
        await Promise.all([
            writeFile(script, code),
            writeFile(
                page,
                html.replace(
                    inlineScript,
                    `<script src="./${basename(script)}"></script>`,
                ),
            ),
        ]);
    }
}

/**
 * Wrap an adapter so every page loads its start script from a file.
 *
 * Chrome doesn't run inline scripts in an extension's pages.
 *
 * @param adapter - the adapter that writes the pages
 * @param pages - the folder the adapter writes them to
 */
export function externalStartScript(adapter: Adapter, pages: string): Adapter {
    return {
        ...adapter,
        async adapt(builder): Promise<void> {
            await adapter.adapt(builder);
            await Promise.all(
                [...builder.prerendered.pages.values()].map(({ file }) =>
                    moveStartScript(join(pages, file)),
                ),
            );
        },
    };
}
