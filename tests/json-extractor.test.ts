import { describe, expect, test } from "bun:test";

import {
  extractJson,
  JsonExtractionError,
} from "../src/utils/json-extractor";

describe("extractJson", () => {
  test("extracts raw JSON object", () => {
    const result = extractJson(
      '{"name":"John","age":25}',
    );

    expect(result).toBe(
      '{"name":"John","age":25}',
    );
  });

  test("extracts JSON from json markdown block", () => {
    const result = extractJson(`
      \`\`\`json
      {
        "name": "John",
        "age": 25
      }
      \`\`\`
    `);

    expect(JSON.parse(result)).toEqual({
      name: "John",
      age: 25,
    });
  });

  test("extracts JSON from generic markdown block", () => {
    const result = extractJson(`
      \`\`\`
      {
        "name": "John"
      }
      \`\`\`
    `);

    expect(JSON.parse(result)).toEqual({
      name: "John",
    });
  });

  test("extracts JSON surrounded by prose", () => {
    const result = extractJson(`
      Here is the requested result:

      {
        "name": "John",
        "age": 25
      }

      Hope this helps.
    `);

    expect(JSON.parse(result)).toEqual({
      name: "John",
      age: 25,
    });
  });

  test("handles nested objects", () => {
    const result = extractJson(`
      Result:
      {
        "user": {
          "name": "John",
          "address": {
            "city": "Pune"
          }
        }
      }
    `);

    expect(JSON.parse(result)).toEqual({
      user: {
        name: "John",
        address: {
          city: "Pune",
        },
      },
    });
  });

  test("handles arrays", () => {
    const result = extractJson(`
      The result is:
      [
        {"id": 1},
        {"id": 2}
      ]
    `);

    expect(JSON.parse(result)).toEqual([
      { id: 1 },
      { id: 2 },
    ]);
  });

  test("handles braces inside strings", () => {
    const result = extractJson(`
      Result:
      {
        "message": "Hello {world}",
        "value": 10
      }
    `);

    expect(JSON.parse(result)).toEqual({
      message: "Hello {world}",
      value: 10,
    });
  });

  test("handles brackets inside strings", () => {
    const result = extractJson(`
      Result:
      {
        "message": "Hello [world]",
        "value": 10
      }
    `);

    expect(JSON.parse(result)).toEqual({
      message: "Hello [world]",
      value: 10,
    });
  });

  test("handles escaped quotes inside strings", () => {
    const result = extractJson(`
      Result:
      {
        "message": "He said \\"hello\\"",
        "value": 10
      }
    `);

    expect(JSON.parse(result)).toEqual({
      message: 'He said "hello"',
      value: 10,
    });
  });

  test("rejects empty output", () => {
    expect(() => extractJson("")).toThrow(
      JsonExtractionError,
    );
  });

  test("rejects output without JSON", () => {
    expect(() =>
      extractJson("There is no JSON here."),
    ).toThrow(JsonExtractionError);
  });

  test("rejects incomplete JSON", () => {
    expect(() =>
      extractJson(`
        {
          "name": "John"
      `),
    ).toThrow(JsonExtractionError);
  });
  test("skips invalid JSON-looking content before valid JSON", () => {
  const result = extractJson(`
    Some explanation {not JSON}

    Actual result:
    {
      "name": "John"
    }
  `);

  expect(JSON.parse(result)).toEqual({
    name: "John",
  });
});
 test("handles braces inside JSON strings", () => {
    const result = extractJson(`
      {"message":"hello {world}"}
    `);

    expect(JSON.parse(result)).toEqual({
      message: "hello {world}",
    });
  });

  test("handles brackets inside JSON strings", () => {
    const result = extractJson(`
      {"message":"items [1, 2, 3]"}
    `);

    expect(JSON.parse(result)).toEqual({
      message: "items [1, 2, 3]",
    });
  });

  test("handles escaped quotes inside JSON strings", () => {
    const result = extractJson(`
      {
        "message": "She said \\"hello\\""
      }
    `);

    expect(JSON.parse(result)).toEqual({
      message: 'She said "hello"',
    });
  });

  test("handles deeply nested objects and arrays", () => {
    const result = extractJson(`
      {
        "user": {
          "name": "John",
          "roles": ["admin", "developer"],
          "metadata": {
            "active": true
          }
        }
      }
    `);

    expect(JSON.parse(result)).toEqual({
      user: {
        name: "John",
        roles: ["admin", "developer"],
        metadata: {
          active: true,
        },
      },
    });
  });

  test("skips invalid JSON before a later valid candidate", () => {
    const result = extractJson(`
      Explanation: {not valid JSON}

      Actual response:
      {
        "name": "John"
      }
    `);

    expect(JSON.parse(result)).toEqual({
      name: "John",
    });
  });

  test("rejects mismatched delimiters", () => {
    expect(() =>
      extractJson(`
        {"name": "John"]
      `),
    ).toThrow(JsonExtractionError);
  });

  test("rejects incomplete nested JSON", () => {
    expect(() =>
      extractJson(`
        {
          "user": {
            "name": "John"
        }
      `),
    ).toThrow(JsonExtractionError);
  });

  test("extracts JSON from a second markdown code block", () => {
    const result = extractJson(`
      \`\`\`
      This is not JSON
      \`\`\`

      \`\`\`json
      {
        "name": "John"
      }
      \`\`\`
    `);

    expect(JSON.parse(result)).toEqual({
      name: "John",
    });
  });

  test("rejects an empty markdown code block", () => {
    expect(() =>
      extractJson(`
        \`\`\`json
        \`\`\`
      `),
    ).toThrow(JsonExtractionError);
  });

  test("handles prose before and after JSON", () => {
    const result = extractJson(`
      Here is the requested result:

      {
        "name": "John",
        "age": 25
      }

      Hope this helps.
    `);

    expect(JSON.parse(result)).toEqual({
      name: "John",
      age: 25,
    });
  });
});
