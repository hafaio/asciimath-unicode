import { assert, nn } from "./utils";

test("assert()", () => {
  expect(assert(true)).toBeUndefined();

  expect(() => assert(false)).toThrow("internal error: failed assert");

  expect(() => assert(false, "my message")).toThrow(
    "internal error: my message"
  );
});

test("nn()", () => {
  expect(nn(5)).toBe(5);
  expect(() => nn(undefined)).toThrow("internal error");
  expect(() => nn(null)).toThrow("internal error");
});
