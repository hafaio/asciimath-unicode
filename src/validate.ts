import { JTDSchemaType as JtdSchema } from "ajv/dist/jtd";
import { validate as jtdValidate } from "jtd";

export type { JtdSchema };

export function check<T>(schema: JtdSchema<T>, val: unknown): val is T {
  const errors = jtdValidate(schema, val);
  return !errors.length;
}
