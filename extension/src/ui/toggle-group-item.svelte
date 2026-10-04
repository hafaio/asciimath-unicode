<!-- @component one toggle of a toggle group -->
<script lang="ts">
    import { ToggleGroup as ToggleGroupPrimitive } from "bits-ui";
    import { cn } from "./utils.ts";

    type Props = ToggleGroupPrimitive.ItemProps;

    let { class: className, ...rest }: Props = $props();
</script>

<ToggleGroupPrimitive.Item
    data-slot="toggle-group-item"
    class={cn(
        "inline-flex items-center justify-center border border-input outline-none transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground",
        className,
    )}
    {...rest}
/>
