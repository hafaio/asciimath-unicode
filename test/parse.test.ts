import parse, {
  Value,
  Unary,
  Binary,
  Paren,
  Superscript,
  Subscript,
  Subsuperscript,
  Fraction,
  Expression,
} from "../lib/parse";

test("it parses the example", () => {
  const parsed = parse("sum_(i=1)^n i^3=((n(n+1))/2)^2");
  const expected = new Expression([
    new Subsuperscript(
      new Value("\u2211", ""),
      "",
      new Paren(
        new Value("(", ""),
        new Expression([
          new Value("i", ""),
          new Value("=", ""),
          new Value("1", ""),
        ]),
        new Value(")", "")
      ),
      "",
      new Value("n", " ")
    ),
    new Superscript(new Value("i", ""), "", new Value("3", "")),
    new Value("=", ""),
    new Superscript(
      new Paren(
        new Value("(", ""),
        new Expression([
          new Fraction(
            new Paren(
              new Value("(", ""),
              new Expression([
                new Value("n", ""),
                new Paren(
                  new Value("(", ""),
                  new Expression([
                    new Value("n", ""),
                    new Value("+", ""),
                    new Value("1", ""),
                  ]),
                  new Value(")", "")
                ),
              ]),
              new Value(")", "")
            ),
            "",
            new Value("2", "")
          ),
        ]),
        new Value(")", "")
      ),
      "",
      new Value("2", "")
    ),
  ]);
  expect(parsed).toEqual(expected);
});

test("it parses unary relations", () => {
  const parsed = parse("sqrt 3");
  const expected = new Expression([
    new Unary(new Value("sqrt", " "), new Value("3", "")),
  ]);
  expect(parsed).toEqual(expected);
});

test("it parses binary relations", () => {
  const parsed = parse("root 3 (x + 1)");
  const expected = new Expression([
    new Binary(
      new Value("root", " "),
      new Value("3", " "),
      new Paren(
        new Value("(", ""),
        new Expression([
          new Value("x", " "),
          new Value("+", " "),
          new Value("1", ""),
        ]),
        new Value(")", "")
      )
    ),
  ]);
  expect(parsed).toEqual(expected);

  const single = parse("root");
  const expectedSingle = new Expression([new Value("root", "")]);
  expect(single).toEqual(expectedSingle);

  const missing = parse("root(3)");
  const expectedMissing = new Expression([
    new Value("root", ""),
    new Paren(
      new Value("(", ""),
      new Expression([new Value("3", "")]),
      new Value(")", "")
    ),
  ]);
  expect(missing).toEqual(expectedMissing);
});

test("it parses super and sub scripts (intermediates)", () => {
  const sub = parse("x_i");
  const expectedSub = new Expression([
    new Subscript(new Value("x", ""), "", new Value("i", "")),
  ]);
  expect(sub).toEqual(expectedSub);

  const sup = parse("x^i");
  const expectedSup = new Expression([
    new Superscript(new Value("x", ""), "", new Value("i", "")),
  ]);
  expect(sup).toEqual(expectedSup);

  const subsup = parse("x_i^j");
  const expectedSubsup = new Expression([
    new Subsuperscript(
      new Value("x", ""),
      "",
      new Value("i", ""),
      "",
      new Value("j", "")
    ),
  ]);
  expect(subsup).toEqual(expectedSubsup);

  const firstDangling = parse("x^");
  const expectedFirstDangling = new Expression([
    new Value("x", ""),
    new Value("^", ""),
  ]);
  expect(firstDangling).toEqual(expectedFirstDangling);

  const subDangling = parse("x_i^");
  const expectedSubDangling = new Expression([
    new Subscript(new Value("x", ""), "", new Value("i", "")),
    new Value("^", ""),
  ]);
  expect(subDangling).toEqual(expectedSubDangling);

  // invlid format produces "poor" results
  const supsub = parse("x^j_i");
  const expectedSupsub = new Expression([
    new Superscript(new Value("x", ""), "", new Value("j", "")),
    new Value("_", ""),
    new Value("i", ""),
  ]);
  expect(supsub).toEqual(expectedSupsub);
});

test("it parses fractions", () => {
  const frac = parse("1/2");
  const expectedFrac = new Expression([
    new Fraction(new Value("1", ""), "", new Value("2", "")),
  ]);
  expect(frac).toEqual(expectedFrac);

  const dangling = parse("1/");
  const expectedDangling = new Expression([
    new Value("1", ""),
    new Value("/", ""),
  ]);
  expect(dangling).toEqual(expectedDangling);
});

test("it parses leading whitespace", () => {
  const empty = parse(" ");
  const expectedEmpty = new Expression([new Value("", " ")]);
  expect(empty).toEqual(expectedEmpty);

  const leading = parse(" 1");
  const expectedLeading = new Expression([
    new Value("", " "),
    new Value("1", ""),
  ]);
  expect(leading).toEqual(expectedLeading);
});

test("it parses dangling parens", () => {
  const parsed = parse(":}[");
  const expected = new Expression([
    new Value("", ""), // parsed ad value
    new Paren(
      new Value("[", ""),
      new Expression([]),
      new Value("", "") // added empty paren
    ),
  ]);
  expect(parsed).toEqual(expected);

  const func = parse("abs)");
  const expectedFunc = new Expression([
    new Value("abs", ""),
    new Value(")", ""),
  ]);
  expect(func).toEqual(expectedFunc);
});
