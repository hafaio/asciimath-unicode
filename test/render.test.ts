import render from "../lib/render";
import parse from "../lib/parse";

// XXX generally redering should be tested independent of parsing, however,
// writing out parse trees is much more effort than the string that generates
// them, so these are going to be less unit-y

test("it renders hard symbols", () => {
  const rendered = render(parse("+ ** *** // \\\\ |><| ^^ ^^^ O/ /_ /_\\ -"));
  expect(rendered).toBe("+ ∗ ⋆ / \\ ⋈ ∧ ⋀ ∅ ∠ △ -");
});

test("it removes whitespace", () => {
  const rendered = render(parse("1/ i + i/ 2 + b_ 2 + c^ i + d_ 2^ i = e \t"), {
    preserveWhitespace: false,
  });
  expect(rendered).toBe("⅟ᵢ+ⁱ⁄₂+b₂+cⁱ+d₂ⁱ=e");

  const more = render(parse("x^i/ 2 + x_ b + x^ q + x_ b^ q"), {
    preserveWhitespace: false,
  });
  expect(more).toBe("xⁱ/2+x_b+x^q+x_b^q");
});

test("it parses vulgar fractions and fraction slash", () => {
  const vulgar = render(parse("1/2"));
  expect(vulgar).toBe("½");

  // with vulgar but not prune parens we still work
  const vulgarParen = render(parse("(1)/2"), { pruneParens: false });
  expect(vulgarParen).toBe("½");

  const vulgarOne = render(parse("1/22"));
  expect(vulgarOne).toBe("⅟₂₂");

  const normal = render(parse("1/2"), { vulgarFractions: false });
  expect(normal).toBe("¹⁄₂");

  const fracSlash = render(parse("1/2"), {
    vulgarFractions: false,
    fractionSlash: false,
  });
  expect(fracSlash).toBe("¹/₂");
});

test("it removes parens", () => {
  const noParens = render(parse("e^(iphi)"));
  expect(noParens).toBe("eⁱᵠ");

  const parens = render(parse("e^(iphi)"), { pruneParens: false });
  expect(parens).toBe("e⁽ⁱᵠ⁾");

  const invisParens = render(parse("e^{:iphi:}"), { pruneParens: false });
  expect(invisParens).toBe("eⁱᵠ");

  const abs = render(parse("abs(x)"));
  expect(abs).toBe("|x|");

  const absParen = render(parse("abs(x)"), { pruneParens: false });
  expect(absParen).toBe("|(x)|");

  const sqrt = render(parse("sqrt (x+1)"));
  expect(sqrt).toBe("√x\u0305+\u03051\u0305");

  const sqrtEmpty = render(parse("sqrt ()"));
  expect(sqrtEmpty).toBe("√");

  const cbrt = render(parse("root 3 (x)"));
  expect(cbrt).toBe("∛x\u0305");
});

test("it applies fonts", () => {
  const cal = render(parse('cc "CAL"'));
  expect(cal).toBe("\uD835\uDC9E\uD835\uDC9C\u2112");

  // still "renders" even if not in mapping
  const not = render(parse('cc "+"'));
  expect(not).toBe("+");
});

test("it applies combinators", () => {
  const dot = render(parse("dot x"));
  expect(dot).toBe("x\u0307");

  const middleDot = render(parse('dot "abcd"'));
  expect(middleDot).toBe("ab\u0307cd");

  const ul = render(parse("ul {:abcd:}"));
  expect(ul).toBe("a\u0332b\u0332c\u0332d\u0332");

  const multi = render(parse("hat dot x"));
  expect(multi).toBe("x\u0307\u0302");
});

test("it renders text and mbox", () => {
  const rendered = render(parse('text "text" mbox "mbox"'));
  expect(rendered).toBe("text mbox");
});

test("it renders functions", () => {
  const unary = render(parse("sin x/2"));
  expect(unary).toBe("ˢⁱⁿ ˣ⁄₂");
});

test("it renders and converts fractions", () => {
  const converted = render(parse("frac{1}{2}"));
  expect(converted).toBe("½");

  const unconverted = render(parse("frac{1}{2}"), { convertFractions: false });
  expect(unconverted).toBe("frac{1}{2}");

  // superscript in numerator prevents superscripting again
  const unrendered = render(parse("x^i/2"));
  expect(unrendered).toBe("xⁱ/2");
});

test("it renders subscripts", () => {
  const rendered = render(parse("x_i"));
  expect(rendered).toBe("xᵢ");

  const white = render(parse("x_(i k)"));
  expect(white).toBe("xᵢ ₖ");

  const nonrendered = render(parse("x_b"));
  expect(nonrendered).toBe("x_b");
});

test("it renders superscripts", () => {
  const rendered = render(parse("x^p"));
  expect(rendered).toBe("xᵖ");

  const nonrendered = render(parse("x^q"));
  expect(nonrendered).toBe("x^q");
});

test("it renders subsuperscripts", () => {
  const rendered = render(parse("x_i^p"));
  expect(rendered).toBe("xᵢᵖ");

  const nonrendered = render(parse("x_i^q"));
  expect(nonrendered).toBe("x_i^q");
});

test("ascii math example works", () => {
  const rendered = render(parse("sum_(i=1)^n i^3=((n(n+1))/2)^2"));
  expect(rendered).toBe("∑ᵢ₌₁ⁿ i³=(ⁿ⁽ⁿ⁺¹⁾⁄₂)²");
});
