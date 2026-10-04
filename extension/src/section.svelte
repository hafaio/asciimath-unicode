<!-- @component a titled card of option rows -->
<script lang="ts">
    import type { Snippet } from "svelte";

    interface Props {
        title: string;
        children: Snippet;
    }

    let { title, children }: Props = $props();
</script>

<section class="flex flex-col gap-2.5">
    <h2
        class="ml-1 font-medium text-[13px] text-muted-foreground uppercase tracking-[0.08em]"
    >
        {title}
    </h2>
    <div class="divide-y rounded-2xl border bg-card">{@render children()}</div>
</section>
