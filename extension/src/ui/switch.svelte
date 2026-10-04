<!-- @component an on/off switch -->
<script lang="ts">
    import { Switch as SwitchPrimitive } from "bits-ui";
    import { cn } from "./utils.ts";

    type Props = SwitchPrimitive.RootProps;

    let {
        class: className,
        checked = $bindable(false),
        ...rest
    }: Props = $props();
</script>

<SwitchPrimitive.Root
    bind:checked
    data-slot="switch"
    class={cn(
        "peer inline-flex h-6.5 w-11 shrink-0 items-center rounded-full p-0.75 outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input",
        className,
    )}
    {...rest}
>
    <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        class="pointer-events-none block size-5 rounded-full transition-transform data-[state=checked]:translate-x-4.5 data-[state=checked]:bg-primary-foreground data-[state=unchecked]:translate-x-0 data-[state=unchecked]:bg-muted-foreground"
    />
</SwitchPrimitive.Root>
