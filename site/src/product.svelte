<!-- @component a card presenting one product, with the links to get it -->
<script lang="ts">
    import { buttonVariants } from "asciimath-unicode/src/ui/button.svelte";
    import type { Snippet } from "svelte";

    interface Props {
        name: string;
        description: string;
        links: { label: string; url: string }[];
        /** a view of the product working */
        demo: Snippet;
    }

    let { name, description, links, demo }: Props = $props();
</script>

<article class="flex flex-col gap-3 rounded-2xl border bg-card p-5 text-left">
    {@render demo()}
    <h2 class="mt-2 font-semibold text-xl">{name}</h2>
    <p class="flex-1 text-muted-foreground leading-normal">{description}</p>
    <div class="flex flex-wrap gap-2">
        {#each links as link (link.url)}
            <a class={buttonVariants()} href={link.url}>{link.label}</a>
        {/each}
    </div>
</article>
