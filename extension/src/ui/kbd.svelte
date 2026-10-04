<!-- @component a keyboard key -->
<script lang="ts">
    import type { HTMLAttributes } from "svelte/elements";
    import { cn } from "./utils.ts";

    interface Props extends HTMLAttributes<HTMLElement> {}

    let { class: className, children, ...rest }: Props = $props();
</script>

<kbd
    data-slot="kbd"
    class={cn(
        "inline-flex h-7 min-w-7 items-center justify-center rounded-md border border-input border-b-2 bg-background px-2 font-mono text-[13px]",
        className,
    )}
    {...rest}
>
    {@render children?.()}
</kbd>
