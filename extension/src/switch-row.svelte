<!-- @component an option row with a label and a switch -->
<script lang="ts">
    import Switch from "./ui/switch.svelte";

    interface Props {
        label: string;
        /** smaller text under the label */
        detail?: string;
        /** show the detail in the monospace font */
        mono?: boolean;
        checked: boolean;
        /** called with the new state when the switch is flipped */
        onChange: (checked: boolean) => void;
    }

    let { label, detail, mono = false, checked, onChange }: Props = $props();
    const id = $props.id();
</script>

<div class="flex items-center gap-4 px-6 py-4.5">
    <label for={id} class="flex grow cursor-pointer flex-col gap-1">
        <span class="font-medium text-[15px]">{label}</span>
        {#if detail !== undefined}
            <span
                class={mono
                    ? "font-mono text-[13px] text-muted-foreground"
                    : "text-[13px] text-muted-foreground"}
            >
                {detail}
            </span>
        {/if}
    </label>
    <Switch {id} bind:checked={() => checked, onChange} />
</div>
