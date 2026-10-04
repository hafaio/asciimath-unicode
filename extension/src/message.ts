import { z } from "zod";

export const messageSchema = z.object({
	type: z.literal("convert"),
	text: z.string(),
});

export type ConvertMessage = z.infer<typeof messageSchema>;

/** tells a tab's running autosub content scripts to stop listening */
export const stopAutosubMessageSchema = z.object({
	type: z.literal("stop-autosub"),
});

export type StopAutosubMessage = z.infer<typeof stopAutosubMessageSchema>;

/** asks a tab whether an autosub content script is listening */
export const pingAutosubMessageSchema = z.object({
	type: z.literal("ping-autosub"),
});

export type PingAutosubMessage = z.infer<typeof pingAutosubMessageSchema>;

const responseSchema = z.discriminatedUnion("type", [
	z.object({ type: z.literal("result"), result: z.string() }),
	z.object({ type: z.literal("error"), err: z.string() }),
]);

export type Response = z.infer<typeof responseSchema>;

export async function convert(text: string): Promise<string> {
	const message: ConvertMessage = { type: "convert", text };
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
