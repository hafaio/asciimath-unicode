import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps, ReactElement } from "react";
import { cn } from "./utils";

const buttonVariants = cva(
	"inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
	{
		variants: {
			variant: {
				default: "bg-primary text-primary-foreground hover:bg-primary/90",
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

export function Button({
	className,
	variant,
	size,
	...props
}: ComponentProps<"button"> &
	VariantProps<typeof buttonVariants>): ReactElement {
	return (
		<button
			type="button"
			data-slot="button"
			className={cn(buttonVariants({ variant, size, className }))}
			{...props}
		/>
	);
}
