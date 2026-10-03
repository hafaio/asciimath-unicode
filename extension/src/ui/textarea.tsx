import type { ComponentProps, ReactElement } from "react";
import { cn } from "./utils";

export function Textarea({
	className,
	...props
}: ComponentProps<"textarea">): ReactElement {
	return (
		<textarea
			data-slot="textarea"
			className={cn(
				"w-full resize-none rounded-2xl border border-border bg-card px-6 py-5 text-card-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30",
				className,
			)}
			{...props}
		/>
	);
}
