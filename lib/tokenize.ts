import { nn } from "./utils";

export interface Token {
  value: string;
  kind: "symbol" | "text" | "number" | "char";
  whitespace: string;
}

const text = /^"([^"]*)"/;
const num = /^-?(([0-9]+(\.[0-9]*)?)|([0-9]*\.[0-9]+))/;
const whitespace = /^\s*/;
const esc = /^\\[^\s\\]/;

// NOTE this could be more efficient with a trie
function getSymbol(
  input: string,
  symbs: Set<string>,
  maxlen: number
): [string, number] | undefined {
  const offset = +!!esc.exec(input);
  let i = Math.min(maxlen, input.length - offset);
  while (i && !symbs.has(input.slice(offset, i + offset))) --i;
  return i ? [input.slice(offset, i + offset), i + offset] : undefined;
}

export default function* tokenize(
  input: string,
  symbols: Iterable<string>
): Generator<Token, void, undefined> {
  if (nn(whitespace.exec(input))[0]) {
    throw new Error("tokenize found leading whitespace");
  }
  const symbs = new Set<string>(symbols);
  const maxlen = Math.max(...[...symbs].map((s) => s.length));
  while (input) {
    let value, kind: Token["kind"], match, symb;
    if ((match = text.exec(input))) {
      value = match[1];
      const read = match[0];
      kind = "text";
      input = input.slice(read.length);
    } else if ((match = num.exec(input))) {
      value = match[0];
      kind = "number";
      input = input.slice(value.length);
    } else if ((symb = getSymbol(input, symbs, maxlen))) {
      [value] = symb;
      kind = "symbol";
      input = input.slice(symb[1]);
    } else {
      value = input.slice(0, 1);
      kind = "char";
      input = input.slice(1);
    }

    const white = nn(whitespace.exec(input))[0];
    input = input.slice(white.length);
    yield {
      value,
      kind,
      whitespace: white,
    };
  }
}
