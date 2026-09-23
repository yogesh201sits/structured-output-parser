import { describe, expect, test } from "bun:test";
import { z } from "zod";

import {
  OutputParserException,
  StructuredOutputParser,
} from "../src";

const schema = z.object({
  name: z.string(),
  age: z.number(),
  occupation: z.string(),
});

const parser = StructuredOutputParser.fromZodSchema(schema);

describe("StructuredOutputParser", () => {
  test("parses raw JSON", async () => {
    const result = await parser.parse(`
      {
        "name": "John",
        "age": 25,
        "occupation": "software engineer"
      }
    `);

    expect(result).toEqual({
      name: "John",
      age: 25,
      occupation: "software engineer",
    });
  });

  test("parses JSON inside a json markdown code block", async () => {
    const result = await parser.parse(`
      \`\`\`json
      {
        "name": "John",
        "age": 25,
        "occupation": "software engineer"
      }
      \`\`\`
    `);

    expect(result).toEqual({
      name: "John",
      age: 25,
      occupation: "software engineer",
    });
  });

  test("parses JSON inside a generic markdown code block", async () => {
    const result = await parser.parse(`
      \`\`\`
      {
        "name": "John",
        "age": 25,
        "occupation": "software engineer"
      }
      \`\`\`
    `);

    expect(result).toEqual({
      name: "John",
      age: 25,
      occupation: "software engineer",
    });
  });

  test("throws OutputParserException for invalid JSON", async () => {
    const output = `
      \`\`\`json
      {
        "name": "John",
        "age": 25,
        "occupation": "software engineer",
      }
      \`\`\`
    `;

    try {
      await parser.parse(output);

      throw new Error("Expected parser to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(OutputParserException);

      if (error instanceof OutputParserException) {
        expect(error.llmOutput).toBe(output);
        expect(error.observation).toBeDefined();
      }
    }
  });

  test("throws OutputParserException for schema validation failure", async () => {
    const output = `
      {
        "name": "John",
        "age": "twenty five",
        "occupation": "software engineer"
      }
    `;

    try {
      await parser.parse(output);

      throw new Error("Expected parser to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(OutputParserException);

      if (error instanceof OutputParserException) {
        expect(error.llmOutput).toBe(output);
        expect(error.observation).toContain("Expected number");
      }
    }
  });

  test("throws when a required field is missing", async () => {
    const output = `
      {
        "name": "John",
        "occupation": "software engineer"
      }
    `;

    await expect(parser.parse(output)).rejects.toBeInstanceOf(
      OutputParserException,
    );
  });

  test("throws when JSON is malformed", async () => {
    const output = `{"name": "John", "age":}`;

    await expect(parser.parse(output)).rejects.toBeInstanceOf(
      OutputParserException,
    );
  });

  test("returns the correct inferred structure", async () => {
    const result = await parser.parse(`
      {
        "name": "John",
        "age": 25,
        "occupation": "software engineer"
      }
    `);

    expect(result.name).toBe("John");
    expect(result.age).toBe(25);
    expect(result.occupation).toBe("software engineer");
  });
});

describe("StructuredOutputParser.getFormatInstructions", () => {
  test("includes JSON Schema instructions", () => {
    const instructions = parser.getFormatInstructions();

    expect(instructions).toContain(
      'You must format your output as a JSON value',
    );

    expect(instructions).toContain(
      'Here is the JSON Schema instance your output must adhere to.',
    );
  });

  test("includes the schema", () => {
    const instructions = parser.getFormatInstructions();

    expect(instructions).toContain('"name"');
    expect(instructions).toContain('"age"');
    expect(instructions).toContain('"occupation"');
  });

  test("includes the JSON markdown code block", () => {
    const instructions = parser.getFormatInstructions();

    expect(instructions).toContain("```json");
  });

  test("creates a parser from names and descriptions", async () => {
    const parser = StructuredOutputParser.fromNamesAndDescriptions({
      name: "The person's name",
      occupation: "The person's occupation",
    });

    const result = await parser.parse(`
    {
      "name": "John",
      "occupation": "software engineer"
    }
  `);

    expect(result).toEqual({
      name: "John",
      occupation: "software engineer",
    });
  });

  test("uses descriptions in the generated JSON schema", () => {
    const parser = StructuredOutputParser.fromNamesAndDescriptions({
      name: "The person's name",
      occupation: "The person's occupation",
    });

    const instructions = parser.getFormatInstructions();

    expect(instructions).toContain(
      `"description":"The person's name"`,
    );

    expect(instructions).toContain(
      `"description":"The person's occupation"`,
    );
  });
});