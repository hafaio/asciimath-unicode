<!-- @component a button -->
<script lang="ts" module>
    import { cva, type VariantProps } from "class-variance-authority";

    /** the classes of a button for each variant and size */
    export const buttonVariants = cva(
        "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
        {
            variants: {
                variant: {
                    default:
                        "bg-primary text-primary-foreground hover:bg-primary/90",
                    outline:
                        "border border-input bg-transparent hover:bg-accent hover:text-accent-foreground",
                },
                size: {
                    default: "h-9 px-4",
                    sm: "h-8 px-3",
                },
            },
            defaultVariants: { variant: "default", size: "default" },
        },
    );
</script>

<script lang="ts">
    import type { HTMLButtonAttributes } from "svelte/elements";
    import { cn } from "./utils.ts";

    interface Props
        extends HTMLButtonAttributes,
            VariantProps<typeof buttonVariants> {}

    let {
        class: className,
        variant,
        size,
        children,
        ...rest
    }: Props = $props();
</script>

<button
    type="button"
    data-slot="button"
    class={cn(buttonVariants({ variant, size }), className)}
    {...rest}
>
    {@render children?.()}
</button>
