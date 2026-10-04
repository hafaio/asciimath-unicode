import { z } from "zod";

/** schema of a {@link ConvertMessage} */
export const messageSchema = z.object({
    type: z.literal("convert"),
    text: z.string(),
});

/** asks the worker to convert ascii math */
export type ConvertMessage = z.infer<typeof messageSchema>;

/** schema of a {@link StopAutosubMessage} */
export const stopAutosubMessageSchema = z.object({
    type: z.literal("stop-autosub"),
});

/** tells a tab's running content scripts to stop converting */
export type StopAutosubMessage = z.infer<typeof stopAutosubMessageSchema>;

/** schema of a {@link PingAutosubMessage} */
export const pingAutosubMessageSchema = z.object({
    type: z.literal("ping-autosub"),
});

/** asks a tab whether a content script is converting in it */
export type PingAutosubMessage = z.infer<typeof pingAutosubMessageSchema>;

const responseSchema = z.discriminatedUnion("type", [
    z.object({ type: z.literal("result"), result: z.string() }),
    z.object({ type: z.literal("error"), err: z.string() }),
]);

/** the worker's answer to a {@link ConvertMessage} */
export type Response = z.infer<typeof responseSchema>;

/** convert ascii math to unicode in the worker, rejecting if it reports an error */
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
