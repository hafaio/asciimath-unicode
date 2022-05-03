import { symbols, Symb } from "./symbols";
import tokenize from "./tokenize";
import { assert, nn } from "./utils";

// TODO instead of keeping a a name or value around, we should keep the raw
// tokens incase we fail to "handle" we can fallback to just the token instead
// of worrying about preserving something

export const symbolMap = new Map<string, Symb>([
  ...symbols.map((symb) => [symb.input, symb] as const),
  ...symbols
    .filter((symb): symb is Symb & { tex: string } => !!symb.tex)
    .map((symb) => [symb.tex, symb] as const),
]);

export class Value {
  constructor(readonly value: string, readonly whitespace: string) {}
}

export class Unary {
  constructor(readonly name: Value, readonly arg: Simple) {}
}

export class Binary {
  constructor(
    readonly name: Value,
    readonly first: Simple,
    readonly second: Simple
  ) {}
}

export class Paren {
  constructor(
    readonly left: Value,
    readonly arg: Expression,
    readonly right: Value
  ) {}
}

export type Simple = Value | Paren | Unary | Binary;

export class Superscript {
  constructor(
    readonly norm: Simple,
    readonly white: string,
    readonly sup: Simple
  ) {}
}

export class Subscript {
  constructor(
    readonly norm: Simple,
    readonly white: string,
    readonly sub: Simple
  ) {}
}

export class Subsuperscript {
  constructor(
    readonly norm: Simple,
    readonly subwhite: string,
    readonly sub: Simple,
    readonly supwhite: string,
    readonly sup: Simple
  ) {}
}

export type Intermediate = Simple | Superscript | Subscript | Subsuperscript;

export class Fraction {
  constructor(
    readonly numer: Intermediate,
    readonly dwhite: string,
    readonly denom: Intermediate
  ) {}
}

export type ExpressionElement = Intermediate | Fraction;

export class Expression {
  constructor(readonly values: ExpressionElement[]) {}
}

export default function parse(input: string): Expression {
  const leading = nn(/^\s*/.exec(input))[0];
  const tokens = [...tokenize(input.slice(leading.length), symbolMap.keys())];
  let index = 0;

  function parseSimple(): Simple | null {
    if (index >= tokens.length) return null;
    const token = tokens[index];
    if (
      token.kind === "text" ||
      token.kind === "number" ||
      token.kind === "char"
    ) {
      ++index;
      return new Value(token.value, token.whitespace);
    }
    assert(token.kind === "symbol", "unreachable");
    const symb = symbolMap.get(token.value);
    /* istanbul ignore if */
    if (!symb) {
      throw new Error("internal error token value not in symbol table");
    } else if (symb.kind === "value" || symb.kind === "infix") {
      // if we got an infix symbol but we want to parse a simple, then we can't
      // infix, and it should be treated as a constant
      ++index;
      return new Value(symb.output, token.whitespace);
    } else if (symb.kind === "unary") {
      ++index;
      const arg = parseSimple();
      return arg
        ? new Unary(new Value(symb.output, token.whitespace), arg)
        : new Value(token.value, token.whitespace);
    } else if (symb.kind === "binary") {
      const reset = ++index;
      const first = parseSimple();
      const second = parseSimple();
      if (first && second) {
        return new Binary(
          new Value(symb.output, token.whitespace),
          first,
          second
        );
      } else {
        index = reset;
        return new Value(token.value, token.whitespace);
      }
    } else if (symb.kind === "left") {
      ++index;
      const open = new Value(symb.output, token.whitespace);
      const expr = parseExpression();
      const ctoken = tokens[index];
      if (ctoken) {
        ++index;
        assert(ctoken.kind === "symbol", "trailing token wasn't a symbol");
        const csymb = symbolMap.get(ctoken.value);
        assert(
          csymb && csymb.kind === "right",
          "trailing token wasn't a close"
        );
        return new Paren(
          open,
          expr,
          new Value(csymb.output, ctoken.whitespace)
        );
      } else {
        return new Paren(open, expr, new Value("", ""));
      }
    } else {
      //symb.kind === "right"
      return null;
    }
  }

  function parseIntermediate(): Intermediate | null {
    const normal = parseSimple();
    if (!normal) return null;
    const subsup = tokens[index];
    if (
      !subsup ||
      subsup.kind !== "symbol" ||
      (subsup.value !== "^" && subsup.value !== "_")
    )
      return normal;
    const reset = index++;
    const next = parseSimple();
    if (!next) {
      index = reset;
      return normal;
    } else if (subsup.value === "^") {
      return new Superscript(normal, subsup.whitespace, next);
    }
    const sub = new Subscript(normal, subsup.whitespace, next);
    const sup = tokens[index];
    if (!sup || sup.kind !== "symbol" || sup.value !== "^") return sub;
    const subreset = index++;
    const fin = parseSimple();
    if (!fin) {
      index = subreset;
      return sub;
    } else {
      return new Subsuperscript(
        normal,
        subsup.whitespace,
        next,
        sup.whitespace,
        fin
      );
    }
  }

  function parseExpression(): Expression {
    const values = [];
    let value;
    while ((value = parseIntermediate())) {
      const token = tokens[index];
      if (!token || token.kind !== "symbol" || token.value !== "/") {
        values.push(value);
        continue;
      }
      const reset = index++;
      const denom = parseIntermediate();
      if (!denom) {
        index = reset;
        values.push(value);
      } else {
        values.push(new Fraction(value, token.whitespace, denom));
      }
    }
    return new Expression(values);
  }

  const elements = [];
  if (leading) elements.push(new Value("", leading));
  while (index < tokens.length) {
    elements.push(...parseExpression().values);
    const token = tokens[index];
    if (token) {
      ++index;
      assert(token.kind === "symbol", "trailing token wasn't a symbol");
      const symb = symbolMap.get(token.value);
      assert(symb && symb.kind === "right", "trailing token wasn't a close");
      elements.push(new Value(symb.output, token.whitespace));
    }
  }
  return new Expression(elements);
}
