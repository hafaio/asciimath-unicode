import type { Config } from "@sveltejs/kit/vite";

/** the svelte options every package in the workspace compiles with */
export const svelteOptions: Config = {
    compilerOptions: {
        runes: true,
    },
    onwarn(warning, defaultHandler): void {
        // dependencies ship components whose warnings aren't ours to fix
        if (warning.filename?.includes("node_modules") === true) {
            defaultHandler?.(warning);
        } else {
            throw new Error(`${warning.code}: ${warning.message}`);
        }
    },
};
