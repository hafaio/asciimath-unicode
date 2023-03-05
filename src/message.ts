import { JtdSchema, check } from "./validate";

export interface SelectedMessage {
  text: string;
}

const messageSchema: JtdSchema<SelectedMessage> = {
  properties: {
    text: { type: "string" },
  },
};

export function isSelectedMessage(msg: unknown): msg is SelectedMessage {
  return check(messageSchema, msg);
}

export interface ConvertedMessage {
  type: "result";
  result: string;
}

export interface InitError {
  type: "error";
  err: string;
}

export type Response = ConvertedMessage | InitError;

const responseSchema: JtdSchema<Response> = {
  discriminator: "type",
  mapping: {
    result: {
      properties: {
        result: { type: "string" },
      },
    },
    error: {
      properties: {
        err: { type: "string" },
      },
    },
  },
};

export async function convert(text: string): Promise<string> {
  const message: SelectedMessage = { text };
  const response: unknown = await chrome.runtime.sendMessage(message);
  if (check(responseSchema, response)) {
    if (response.type === "result") {
      return response.result;
    } else {
      throw new Error(response.err);
    }
  } else {
    throw new Error("invalid response");
  }
}
