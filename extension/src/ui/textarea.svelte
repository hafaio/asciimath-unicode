<!-- @component a multi-line text box -->
<script lang="ts">
    import type { HTMLTextareaAttributes } from "svelte/elements";
    import { cn } from "./utils.ts";

    interface Props extends HTMLTextareaAttributes {}

    let { class: className, ...rest }: Props = $props();
</script>

<textarea
    data-slot="textarea"
    class={cn(
        "w-full resize-none rounded-2xl border border-border bg-card px-6 py-5 text-card-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30",
        className,
    )}
    {...rest}
></textarea>
