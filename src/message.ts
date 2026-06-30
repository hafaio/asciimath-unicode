import { z } from "zod";

export const messageSchema = z.object({
	text: z.string(),
});

export type SelectedMessage = z.infer<typeof messageSchema>;

const responseSchema = z.discriminatedUnion("type", [
	z.object({ type: z.literal("result"), result: z.string() }),
	z.object({ type: z.literal("error"), err: z.string() }),
]);

export type Response = z.infer<typeof responseSchema>;

export async function convert(text: string): Promise<string> {
	const message: SelectedMessage = { text };
	const response: unknown = await chrome.runtime.sendMessage(message);
	const parsed = responseSchema.safeParse(response);
	if (parsed.success) {
		if (parsed.data.type === "result") {
			return parsed.data.result;
		} else {
			throw new Error(parsed.data.err);
		}
	} else {
		throw new Error("invalid response");
	}
}
