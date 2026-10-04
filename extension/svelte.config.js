/** @type {import("@sveltejs/vite-plugin-svelte").SvelteConfig} */
export default {
    compilerOptions: {
        runes: true,
    },
    onwarn(warning, defaultHandler) {
        // dependencies ship components whose warnings aren't ours to fix
        if (warning.filename?.includes("node_modules")) {
            defaultHandler?.(warning);
        } else {
            throw new Error(`${warning.code}: ${warning.message}`);
        }
    },
};
