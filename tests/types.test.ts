import { expectTypeOf, test } from "bun:test";
import { z } from "zod";

import { StructuredOutputParser } from "../src";

test("infers output type from Zod schema", async () => {
  const parser = StructuredOutputParser.fromZodSchema(
    z.object({
      name: z.string(),
      age: z.number(),
      active: z.boolean(),
    }),
  );

  const result = await parser.parse(`
    {
      "name": "John",
      "age": 25,
      "active": true
    }
  `);

  expectTypeOf(result).toEqualTypeOf<{
    name: string;
    age: number;
    active: boolean;
  }>();
});