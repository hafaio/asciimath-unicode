<!-- @component the head shared by every page -->
<script lang="ts">
    import "asciimath-unicode/src/theme.css";
    import icon from "asciimath-unicode/static/am.svg";
    import type { Snippet } from "svelte";
    import { copy } from "../copy.ts";

    let { children }: { children: Snippet } = $props();
</script>

<svelte:head>
    <title>{copy.pageTitle}</title>
    <meta name="description" content={copy.pageDescription}>
    <link rel="icon" href={icon}>
</svelte:head>

{@render children()}
