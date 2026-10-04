import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** join class names, with later Tailwind classes overriding earlier ones */
export function cn(...inputs: ClassValue[]): string {
    return twMerge(clsx(inputs));
}
