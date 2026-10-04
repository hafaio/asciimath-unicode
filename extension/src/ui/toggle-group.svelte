<!-- @component a set of toggles of which one is on -->
<script lang="ts">
    import { ToggleGroup as ToggleGroupPrimitive } from "bits-ui";
    import { cn } from "./utils.ts";

    type Props = Omit<
        Extract<ToggleGroupPrimitive.RootProps, { type: "single" }>,
        "type"
    >;

    let { class: className, value = $bindable(""), ...rest }: Props = $props();
</script>

<ToggleGroupPrimitive.Root
    type="single"
    bind:value
    data-slot="toggle-group"
    class={cn("flex flex-wrap items-center gap-2", className)}
    {...rest}
/>
