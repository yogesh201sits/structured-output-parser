import { describe, expect, test } from "bun:test";
import { z } from "zod";
import { JsonMarkdownStructuredOutputParser } from "../src/output-parsers/json-markdown";

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
  test("parses JSON with surrounding whitespace", async () => {
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

test("parses an empty string as invalid output", async () => {
  await expect(parser.parse("")).rejects.toBeInstanceOf(
    OutputParserException,
  );
});

test("rejects a markdown block without closing fence", async () => {
  const output = `
    \`\`\`json
    {
      "name": "John",
      "age": 25,
      "occupation": "software engineer"
    }
  `;

  await expect(parser.parse(output)).rejects.toBeInstanceOf(
    OutputParserException,
  );
});

test("rejects non-JSON content", async () => {
  await expect(
    parser.parse("This is not JSON"),
  ).rejects.toBeInstanceOf(OutputParserException);
});

test("parses nested JSON structures", async () => {
  const nestedParser = StructuredOutputParser.fromZodSchema(
    z.object({
      user: z.object({
        name: z.string(),
        age: z.number(),
      }),
      tags: z.array(z.string()),
    }),
  );

  const result = await nestedParser.parse(`
    {
      "user": {
        "name": "John",
        "age": 25
      },
      "tags": ["developer", "typescript"]
    }
  `);

  expect(result).toEqual({
    user: {
      name: "John",
      age: 25,
    },
    tags: ["developer", "typescript"],
  });
});
test("supports optional fields", async () => {
  const optionalParser = StructuredOutputParser.fromZodSchema(
    z.object({
      name: z.string(),
      nickname: z.string().optional(),
    }),
  );

  const result = await optionalParser.parse(`
    {
      "name": "John"
    }
  `);

  expect(result).toEqual({
    name: "John",
  });
});

test("supports enum fields", async () => {
  const enumParser = StructuredOutputParser.fromZodSchema(
    z.object({
      status: z.enum(["active", "inactive"]),
    }),
  );

  const result = await enumParser.parse(`
    {
      "status": "active"
    }
  `);

  expect(result.status).toBe("active");
});

test("rejects invalid enum values", async () => {
  const enumParser = StructuredOutputParser.fromZodSchema(
    z.object({
      status: z.enum(["active", "inactive"]),
    }),
  );

  await expect(
    enumParser.parse(`{"status": "pending"}`),
  ).rejects.toBeInstanceOf(OutputParserException);
});
test("classifies invalid JSON errors", async () => {
  try {
    await parser.parse(`{"name": "John", "age":}`);
    throw new Error("Expected parser to throw");
  } catch (error) {
    expect(error).toBeInstanceOf(OutputParserException);

    if (error instanceof OutputParserException) {
      expect(error.code).toBe("INVALID_JSON");
      expect(error.llmOutput).toBe(`{"name": "John", "age":}`);
      expect(error.observation).toBeDefined();
      expect(error.cause).toBeInstanceOf(SyntaxError);
    }
  }
});

test("classifies schema validation errors", async () => {
  try {
    await parser.parse(`
      {
        "name": "John",
        "age": "twenty five",
        "occupation": "software engineer"
      }
    `);

    throw new Error("Expected parser to throw");
  } catch (error) {
    expect(error).toBeInstanceOf(OutputParserException);

    if (error instanceof OutputParserException) {
      expect(error.code).toBe("SCHEMA_VALIDATION");
      expect(error.llmOutput).toBeDefined();
      expect(error.observation).toContain("Expected number");
      expect(error.cause).toBeInstanceOf(z.ZodError);
    }
  }
});
describe("JsonMarkdownStructuredOutputParser", () => {
  test("parses JSON markdown output", async () => {
    const parser = new JsonMarkdownStructuredOutputParser(
      z.object({
        name: z.string(),
        age: z.number(),
      }),
    );

    const result = await parser.parse(`
      \`\`\`json
      {
        "name": "John",
        "age": 25
      }
      \`\`\`
    `);

    expect(result).toEqual({
      name: "John",
      age: 25,
    });
  });

  test("generates markdown-oriented format instructions", () => {
    const parser = new JsonMarkdownStructuredOutputParser(
      z.object({
        name: z.string().describe("The person's name"),
        age: z.number().describe("The person's age"),
      }),
    );

    const instructions = parser.getFormatInstructions();

    expect(instructions).toContain(
      "Return a markdown code snippet with a JSON object",
    );

    expect(instructions).toContain("```json");
    expect(instructions).toContain('"name"');
    expect(instructions).toContain('"age"');
  });

  test("inherits structured validation", async () => {
    const parser = new JsonMarkdownStructuredOutputParser(
      z.object({
        age: z.number(),
      }),
    );

    await expect(
      parser.parse(`
        \`\`\`json
        {
          "age": "twenty"
        }
        \`\`\`
      `),
    ).rejects.toBeInstanceOf(OutputParserException);
  });
});
test("parses JSON surrounded by prose", async () => {
  const parser = StructuredOutputParser.fromZodSchema(
    z.object({
      name: z.string(),
      age: z.number(),
    }),
  );

  const result = await parser.parse(`
    Here is the requested result:

    {
      "name": "John",
      "age": 25
    }

    Hope this helps.
  `);

  expect(result).toEqual({
    name: "John",
    age: 25,
  });
});

test("parses nested JSON surrounded by prose", async () => {
  const parser = StructuredOutputParser.fromZodSchema(
    z.object({
      user: z.object({
        name: z.string(),
        address: z.object({
          city: z.string(),
        }),
      }),
    }),
  );

  const result = await parser.parse(`
    The result is:

    {
      "user": {
        "name": "John",
        "address": {
          "city": "Pune"
        }
      }
    }

    End of response.
  `);

  expect(result).toEqual({
    user: {
      name: "John",
      address: {
        city: "Pune",
      },
    },
  });
});

test("parses JSON containing braces inside strings", async () => {
  const parser = StructuredOutputParser.fromZodSchema(
    z.object({
      message: z.string(),
    }),
  );

  const result = await parser.parse(`
    Result:

    {
      "message": "Hello {world}"
    }
  `);

  expect(result).toEqual({
    message: "Hello {world}",
  });
});

test("throws INVALID_FORMAT when JSON cannot be extracted", async () => {
  const parser = StructuredOutputParser.fromZodSchema(
    z.object({
      name: z.string(),
    }),
  );

  try {
    await parser.parse("There is no JSON in this response.");
    throw new Error("Expected parser to throw");
  } catch (error) {
    expect(error).toBeInstanceOf(OutputParserException);

    expect((error as OutputParserException).code).toBe(
      "INVALID_FORMAT",
    );
  }
});
test("classifies complete but invalid JSON as INVALID_JSON", async () => {
  const parser = StructuredOutputParser.fromZodSchema(
    z.object({
      name: z.string(),
    }),
  );

  try {
    await parser.parse(`
      {
        "name": "John",
      }
    `);

    throw new Error("Expected parser to throw");
  } catch (error) {
    expect(error).toBeInstanceOf(OutputParserException);

    expect(
      (error as OutputParserException).code,
    ).toBe("INVALID_JSON");
  }
});
});