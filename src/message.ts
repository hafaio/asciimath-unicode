import { CompiledSchema, discriminator, properties, string } from "jtd-ts";

export interface SelectedMessage {
  text: string;
}

export const messageSchema = properties({
  text: string(),
}) satisfies CompiledSchema<SelectedMessage, unknown>;

export interface ConvertedMessage {
  type: "result";
  result: string;
}

export interface InitError {
  type: "error";
  err: string;
}

export type Response = ConvertedMessage | InitError;

const responseSchema = discriminator("type", {
  result: properties({ result: string() }),
  error: properties({ err: string() }),
}) satisfies CompiledSchema<Response, unknown>;

export async function convert(text: string): Promise<string> {
  const message: SelectedMessage = { text };
  const response: unknown = await chrome.runtime.sendMessage(message);
  if (responseSchema.guard(response)) {
    if (response.type === "result") {
      return response.result;
    } else {
      throw new Error(response.err);
    }
  } else {
    throw new Error("invalid response");
  }
}
