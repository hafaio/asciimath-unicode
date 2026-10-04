<!-- @component the page presenting the extension and the keyboard -->
<script lang="ts">
    import icon from "asciimath-unicode/public/am.svg";
    import { copy } from "./copy.ts";
    import Demo from "./demo.svelte";
    import { extensionFrames, keyboardFrames } from "./demo-frames.ts";
    import Product from "./product.svelte";

    const products = [
        { ...copy.extension, frames: extensionFrames },
        { ...copy.keyboard, frames: keyboardFrames },
    ];
</script>

<div
    class="min-h-screen bg-[linear-gradient(var(--card),var(--background)_420px)]"
>
    <main class="mx-auto max-w-240 px-4 pt-24 pb-16 text-center">
        <img src={icon} alt="" class="mx-auto size-14">
        <h1
            class="mt-6 text-balance font-semibold text-[clamp(40px,7vw,64px)] leading-tight tracking-tight"
        >
            {copy.headline}
        </h1>
        <p
            class="mx-auto mt-4 max-w-140 text-[19px] text-muted-foreground leading-normal"
        >
            {copy.subhead}
        </p>
        <div class="mt-14 grid grid-cols-1 gap-5 md:grid-cols-2">
            {#each products as product (product.name)}
                <Product
                    name={product.name}
                    description={product.description}
                    linkLabel={product.linkLabel}
                    linkUrl={product.linkUrl}
                >
                    {#snippet demo()}
                        <Demo frames={product.frames} />
                    {/snippet}
                </Product>
            {/each}
        </div>
    </main>
</div>
