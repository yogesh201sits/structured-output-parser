import { describe, expect, test } from "bun:test";
import { z } from "zod";

import {
  OutputParserException,
  StructuredOutputParser,
} from "../src";

const schema = z.object({
  name: z.string().describe("The person's name"),
  age: z.number().describe("The person's age"),
  occupation: z.string().describe("The person's occupation"),
});

const parser = StructuredOutputParser.fromZodSchema(schema);

describe("StructuredOutputParser", () => {
  test("creates parser from Zod schema", () => {
    expect(parser.schema).toBe(schema);
  });

  test("generates format instructions", () => {
    const instructions = parser.getFormatInstructions();

    expect(instructions).toContain(
      "You must format your output as a JSON value",
    );

    expect(instructions).toContain(
      "Here is the JSON Schema instance your output must adhere to",
    );

    expect(instructions).toContain("```json");

    expect(instructions).toContain(
      `"name":{"type":"string","description":"The person's name"}`,
    );

    expect(instructions).toContain(
      `"age":{"type":"number","description":"The person's age"}`,
    );

    expect(instructions).toContain(
      `"occupation":{"type":"string","description":"The person's occupation"}`,
    );
  });

  test("parses raw JSON", async () => {
    const result = await parser.parse(
      JSON.stringify({
        name: "John",
        age: 25,
        occupation: "Software Engineer",
      }),
    );

    expect(result).toEqual({
      name: "John",
      age: 25,
      occupation: "Software Engineer",
    });
  });

  test("parses fenced JSON", async () => {
    const result = await parser.parse(`
\`\`\`json
{
  "name": "John",
  "age": 25,
  "occupation": "Software Engineer"
}
\`\`\`
`);

    expect(result).toEqual({
      name: "John",
      age: 25,
      occupation: "Software Engineer",
    });
  });

  test("rejects invalid JSON", async () => {
    await expect(
      parser.parse(`
\`\`\`json
{
  "name": "John",
  "age": 25,
\`\`\`
`),
    ).rejects.toBeInstanceOf(OutputParserException);
  });

  test("rejects data that violates the Zod schema", async () => {
    await expect(
      parser.parse(
        JSON.stringify({
          name: "John",
          age: "twenty-five",
          occupation: "Software Engineer",
        }),
      ),
    ).rejects.toBeInstanceOf(OutputParserException);
  });

  test("supports nested Zod schemas", async () => {
    const nestedSchema = z.object({
      user: z.object({
        name: z.string(),
        age: z.number(),
      }),
      skills: z.array(z.string()),
    });

    const nestedParser =
      StructuredOutputParser.fromZodSchema(nestedSchema);

    const result = await nestedParser.parse(
      JSON.stringify({
        user: {
          name: "John",
          age: 25,
        },
        skills: ["TypeScript", "Bun"],
      }),
    );

    expect(result).toEqual({
      user: {
        name: "John",
        age: 25,
      },
      skills: ["TypeScript", "Bun"],
    });
  });

  test("preserves TypeScript inference", async () => {
    const result = await parser.parse(
      JSON.stringify({
        name: "John",
        age: 25,
        occupation: "Engineer",
      }),
    );

    const name: string = result.name;
    const age: number = result.age;
    const occupation: string = result.occupation;

    expect(name).toBe("John");
    expect(age).toBe(25);
    expect(occupation).toBe("Engineer");
  });
});