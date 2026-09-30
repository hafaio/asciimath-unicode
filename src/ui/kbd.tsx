import type { ComponentProps, ReactElement } from "react";
import { cn } from "./utils";

export function Kbd({
	className,
	...props
}: ComponentProps<"kbd">): ReactElement {
	return (
		<kbd
			data-slot="kbd"
			className={cn(
				"inline-flex h-7 min-w-7 items-center justify-center rounded-md border border-input border-b-2 bg-background px-2 font-mono text-[13px]",
				className,
			)}
			{...props}
		/>
	);
}

export function KbdGroup({
	className,
	...props
}: ComponentProps<"span">): ReactElement {
	return (
		<span
			data-slot="kbd-group"
			className={cn("inline-flex items-center gap-1", className)}
			{...props}
		/>
	);
}
