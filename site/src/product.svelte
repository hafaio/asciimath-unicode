<!-- @component a card presenting one product, with a link to get it -->
<script lang="ts">
    import { buttonVariants } from "asciimath-unicode/src/ui/button.svelte";
    import type { Snippet } from "svelte";

    interface Props {
        name: string;
        description: string;
        linkLabel: string;
        linkUrl: string;
        /** a view of the product working */
        demo: Snippet;
    }

    let { name, description, linkLabel, linkUrl, demo }: Props = $props();
</script>

<article class="flex flex-col gap-3 rounded-2xl border bg-card p-5 text-left">
    {@render demo()}
    <h2 class="mt-2 font-semibold text-xl">{name}</h2>
    <p class="flex-1 text-muted-foreground leading-normal">{description}</p>
    <a class={buttonVariants({ class: "self-start" })} href={linkUrl}>
        {linkLabel}
    </a>
</article>
