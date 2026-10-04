<!-- @component how to use the extension, with a box to try it in -->
<script lang="ts">
    import { copy } from "./copy.ts";
    import { type DelimiterName, delimiters } from "./delimiters.ts";
    import { startConverting } from "./typing.ts";
    import Textarea from "./ui/textarea.svelte";

    interface Props {
        /** the delimiter whose markers the placeholder shows */
        delimiter: DelimiterName;
    }

    let { delimiter }: Props = $props();
    const { open, close } = $derived(delimiters[delimiter]);

    $effect(() =>
        globalThis.chrome?.runtime?.id ? startConverting(false) : undefined,
    );
</script>

<section class="flex flex-col gap-3.5">
    <h2 class="font-semibold text-[28px] tracking-tight">
        {copy.usageHeading}
    </h2>
    <p class="text-[15px] text-muted-foreground leading-relaxed">
        {copy.usage}
    </p>
    <Textarea
        aria-label={copy.tryLabel}
        class="h-32.5 text-[22px] leading-[1.45]"
        placeholder={copy.tryPlaceholder(`${open}x^2${close}`)}
    />
</section>
