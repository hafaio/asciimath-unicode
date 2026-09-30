import { Switch as SwitchPrimitive } from "radix-ui";
import type { ComponentProps, ReactElement } from "react";
import { cn } from "./utils";

export function Switch({
	className,
	...props
}: ComponentProps<typeof SwitchPrimitive.Root>): ReactElement {
	return (
		<SwitchPrimitive.Root
			data-slot="switch"
			className={cn(
				"peer inline-flex h-6.5 w-11 shrink-0 items-center rounded-full p-0.75 outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input",
				className,
			)}
			{...props}
		>
			<SwitchPrimitive.Thumb
				data-slot="switch-thumb"
				className="pointer-events-none block size-5 rounded-full transition-transform data-[state=checked]:translate-x-4.5 data-[state=checked]:bg-primary-foreground data-[state=unchecked]:translate-x-0 data-[state=unchecked]:bg-muted-foreground"
			/>
		</SwitchPrimitive.Root>
	);
}
