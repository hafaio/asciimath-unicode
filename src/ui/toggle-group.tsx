import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui";
import type { ComponentProps, ReactElement } from "react";
import { cn } from "./utils";

export function ToggleGroup({
	className,
	...props
}: ComponentProps<typeof ToggleGroupPrimitive.Root>): ReactElement {
	return (
		<ToggleGroupPrimitive.Root
			data-slot="toggle-group"
			className={cn("flex flex-wrap items-center gap-2", className)}
			{...props}
		/>
	);
}

export function ToggleGroupItem({
	className,
	...props
}: ComponentProps<typeof ToggleGroupPrimitive.Item>): ReactElement {
	return (
		<ToggleGroupPrimitive.Item
			data-slot="toggle-group-item"
			className={cn(
				"inline-flex items-center justify-center border border-input outline-none transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground",
				className,
			)}
			{...props}
		/>
	);
}
