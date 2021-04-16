import { symbolMap } from "../lib/parse";
import tokenize from "../lib/tokenize";

test("it tokenizes the example", () => {
  const tokens = tokenize("sum_(i=1)^n i^3=((n(n+1))/2)^2", symbolMap.keys());
  expect([...tokens]).toEqual([
    { value: "sum", kind: "symbol", whitespace: "" },
    { value: "_", kind: "symbol", whitespace: "" },
    { value: "(", kind: "symbol", whitespace: "" },
    { value: "i", kind: "char", whitespace: "" },
    { value: "=", kind: "char", whitespace: "" },
    { value: "1", kind: "number", whitespace: "" },
    { value: ")", kind: "symbol", whitespace: "" },
    { value: "^", kind: "symbol", whitespace: "" },
    { value: "n", kind: "char", whitespace: " " },
    { value: "i", kind: "char", whitespace: "" },
    { value: "^", kind: "symbol", whitespace: "" },
    { value: "3", kind: "number", whitespace: "" },
    { value: "=", kind: "char", whitespace: "" },
    { value: "(", kind: "symbol", whitespace: "" },
    { value: "(", kind: "symbol", whitespace: "" },
    { value: "n", kind: "char", whitespace: "" },
    { value: "(", kind: "symbol", whitespace: "" },
    { value: "n", kind: "char", whitespace: "" },
    { value: "+", kind: "char", whitespace: "" },
    { value: "1", kind: "number", whitespace: "" },
    { value: ")", kind: "symbol", whitespace: "" },
    { value: ")", kind: "symbol", whitespace: "" },
    { value: "/", kind: "symbol", whitespace: "" },
    { value: "2", kind: "number", whitespace: "" },
    { value: ")", kind: "symbol", whitespace: "" },
    { value: "^", kind: "symbol", whitespace: "" },
    { value: "2", kind: "number", whitespace: "" },
  ]);
});

test("it tokenizes bad cases", () => {
  const five = tokenize("^^^^^", symbolMap.keys());
  expect([...five]).toEqual([
    { value: "^^^", kind: "symbol", whitespace: "" },
    { value: "^^", kind: "symbol", whitespace: "" },
  ]);

  const four_one = tokenize("^^^^ ^", symbolMap.keys());
  expect([...four_one]).toEqual([
    { value: "^^^", kind: "symbol", whitespace: "" },
    { value: "^", kind: "symbol", whitespace: " " },
    { value: "^", kind: "symbol", whitespace: "" },
  ]);

  const under = tokenize("___|", symbolMap.keys());
  expect([...under]).toEqual([
    { value: "_", kind: "symbol", whitespace: "" },
    { value: "__|", kind: "symbol", whitespace: "" },
  ]);
});

test("it throws error on leading whitespace", () => {
  const tokens = tokenize(" a", []);
  expect(() => tokens.next()).toThrow("leading whitespace");
});
