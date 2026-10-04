<!-- @component a row of keyboard keys -->
<script lang="ts">
    import type { HTMLAttributes } from "svelte/elements";
    import { cn } from "./utils.ts";

    interface Props extends HTMLAttributes<HTMLSpanElement> {}

    let { class: className, children, ...rest }: Props = $props();
</script>

<span
    data-slot="kbd-group"
    class={cn("inline-flex items-center gap-1", className)}
    {...rest}
>
    {@render children?.()}
</span>
