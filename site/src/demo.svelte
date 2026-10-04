<!-- @component a looping animation of math being typed -->
<script lang="ts">
    import type { Frame } from "./demo-frames.ts";

    interface Props {
        /** the moments to show in turn, starting over after the last */
        frames: Frame[];
    }

    let { frames }: Props = $props();

    const keyDelay = 110;
    const restDelay = 2600;
    const still = globalThis.matchMedia(
        "(prefers-reduced-motion: reduce)",
    ).matches;

    let index = $state(0);
    const last = $derived(frames.length - 1);
    const frame = $derived(frames[still ? last : index]);

    $effect(() => {
        const timer = still
            ? undefined
            : setTimeout(
                  () => {
                      index = index === last ? 0 : index + 1;
                  },
                  index === last ? restDelay : keyDelay,
              );
        return () => clearTimeout(timer);
    });
</script>

<div
    aria-hidden="true"
    class="min-h-30 whitespace-pre-wrap break-all rounded-xl bg-accent px-4 py-5 font-mono text-[17px] leading-relaxed"
>
    {frame?.plain}<span
        class="underline decoration-2 decoration-primary underline-offset-[6px]"
        >{frame?.held}</span
    ><span
        class="ml-px inline-block h-[1.1em] w-0.5 bg-primary align-text-bottom motion-safe:animate-pulse"
    ></span>
</div>
