import render from "../lib/render";
import parse from "../lib/parse";

// XXX generally redering should be tested independent of parsing, however,
// writing out parse trees is much more effort than the string that generates
// them, so these are going to be less unit-y

test("it renders hard symbols", () => {
  const rendered = render(parse("+ ** *** // \\\\ |><| ^^ ^^^ O/ /_ /_\\ -"));
  expect(rendered).toEqual("+ ∗ ⋆ / \\ ⋈ ∧ ⋀ ∅ ∠ △ -");
});

test("it removes whitespace", () => {
  const rendered = render(parse("1/ i + i/ 2 + b_ 2 + c^ i + d_ 2^ i = e \t"), {
    preserveWhitespace: false,
  });
  expect(rendered).toEqual("⅟ᵢ+ⁱ⁄₂+b₂+cⁱ+d₂ⁱ=e");

  const more = render(parse("x^i/ 2 + x_ b + x^ q + x_ b^ q"), {
    preserveWhitespace: false,
  });
  expect(more).toEqual("xⁱ/2+x_b+x^q+x_b^q");
});

test("it parses vulgar fractions and fraction slash", () => {
  const vulgar = render(parse("1/2"));
  expect(vulgar).toEqual("½");

  // with vulgar but not prune parens we still work
  const vulgarParen = render(parse("(1)/2"), { pruneParens: false });
  expect(vulgarParen).toEqual("½");

  const vulgarOne = render(parse("1/22"));
  expect(vulgarOne).toEqual("⅟₂₂");

  const normal = render(parse("1/2"), { vulgarFractions: false });
  expect(normal).toEqual("¹⁄₂");

  const fracSlash = render(parse("1/2"), {
    vulgarFractions: false,
    fractionSlash: false,
  });
  expect(fracSlash).toEqual("¹/₂");
});

test("it removes parens", () => {
  const noParens = render(parse("e^(iphi)"));
  expect(noParens).toEqual("eⁱᵠ");

  const parens = render(parse("e^(iphi)"), { pruneParens: false });
  expect(parens).toEqual("e⁽ⁱᵠ⁾");

  const invisParens = render(parse("e^{:iphi:}"), { pruneParens: false });
  expect(invisParens).toEqual("eⁱᵠ");

  const abs = render(parse("abs(x)"));
  expect(abs).toEqual("|x|");

  const absParen = render(parse("abs(x)"), { pruneParens: false });
  expect(absParen).toEqual("|(x)|");

  const sqrt = render(parse("sqrt (x+1)"));
  expect(sqrt).toEqual("√x\u0305+\u03051\u0305");

  const sqrtEmpty = render(parse("sqrt ()"));
  expect(sqrtEmpty).toEqual("√");

  const cbrt = render(parse("root 3 (x)"));
  expect(cbrt).toEqual("∛x\u0305");
});

test("it applies fonts", () => {
  const cal = render(parse('cc "CAL"'));
  expect(cal).toEqual("\uD835\uDC9E\uD835\uDC9C\u2112");

  // still "renders" even if not in mapping
  const not = render(parse('cc "+"'));
  expect(not).toEqual("+");
});

test("it applies combinators", () => {
  const dot = render(parse("dot x"));
  expect(dot).toEqual("x\u0307");

  const middleDot = render(parse('dot "abcd"'));
  expect(middleDot).toEqual("ab\u0307cd");

  const ul = render(parse("ul {:abcd:}"));
  expect(ul).toEqual("a\u0332b\u0332c\u0332d\u0332");

  const multi = render(parse("hat dot x"));
  expect(multi).toEqual("x\u0307\u0302");
});

test("it renders text and mbox", () => {
  const rendered = render(parse('text "text" mbox "mbox"'));
  expect(rendered).toEqual("text mbox");
});

test("it renders functions", () => {
  const unary = render(parse("sin x/2"));
  expect(unary).toEqual("ˢⁱⁿ ˣ⁄₂");
});

test("it renders and converts fractions", () => {
  const converted = render(parse("frac{1}{2}"));
  expect(converted).toEqual("½");

  const unconverted = render(parse("frac{1}{2}"), { convertFractions: false });
  expect(unconverted).toEqual("frac{1}{2}");

  // superscript in numerator prevents superscripting again
  const unrendered = render(parse("x^i/2"));
  expect(unrendered).toEqual("xⁱ/2");
});

test("it renders subscripts", () => {
  const rendered = render(parse("x_i"));
  expect(rendered).toEqual("xᵢ");

  const white = render(parse("x_(i k)"));
  expect(white).toEqual("xᵢ ₖ");

  const nonrendered = render(parse("x_b"));
  expect(nonrendered).toEqual("x_b");
});

test("it renders superscripts", () => {
  const rendered = render(parse("x^p"));
  expect(rendered).toEqual("xᵖ");

  const nonrendered = render(parse("x^q"));
  expect(nonrendered).toEqual("x^q");
});

test("it renders subsuperscripts", () => {
  const rendered = render(parse("x_i^p"));
  expect(rendered).toEqual("xᵢᵖ");

  const nonrendered = render(parse("x_i^q"));
  expect(nonrendered).toEqual("x_i^q");
});

test("ascii math example works", () => {
  const rendered = render(parse("sum_(i=1)^n i^3=((n(n+1))/2)^2"));
  expect(rendered).toEqual("∑ᵢ₌₁ⁿ i³=(ⁿ⁽ⁿ⁺¹⁾⁄₂)²");
});
