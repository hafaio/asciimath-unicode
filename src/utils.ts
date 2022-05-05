/** assert statement */
export function assert<T>(arg: T, msg = "failed assert"): asserts arg {
  if (!arg) throw new Error(`internal error: ${msg}`);
}

/** verify the argument is not null or undefined */
export function nn<T>(arg: T | null | undefined): T {
  assert(arg);
  return arg;
}
