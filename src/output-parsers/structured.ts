import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

import { OutputParserException } from "../errors/output-parser";
import {
  extractJson,
  JsonExtractionError,
} from "../utils/json-extractor";
import { BaseOutputParser } from "./base";

type AnyZodSchema = z.ZodTypeAny;

export class StructuredOutputParser<
  T extends AnyZodSchema,
> extends BaseOutputParser<z.infer<T>> {
  readonly schema: T;

  constructor(schema: T) {
    super();

    this.schema = schema;
  }

  /**
   * Create a StructuredOutputParser from a Zod schema.
   */
  static fromZodSchema<T extends AnyZodSchema>(
    schema: T,
  ): StructuredOutputParser<T> {
    return new StructuredOutputParser(schema);
  }

  /**
   * Create a StructuredOutputParser from field names and descriptions.
   *
   * Each field is represented as a required string.
   */
  static fromNamesAndDescriptions<
    S extends Record<string, string>,
  >(
    schemas: S,
  ): StructuredOutputParser<
    z.ZodObject<{
      [K in keyof S]: z.ZodString;
    }>
  > {
    const shape = Object.fromEntries(
      Object.entries(schemas).map(([name, description]) => [
        name,
        z.string().describe(description),
      ]),
    ) as {
        [K in keyof S]: z.ZodString;
      };

    return new StructuredOutputParser(z.object(shape));
  }

  /**
   * Generate instructions that tell an LLM how its output
   * must be formatted.
   */
  getFormatInstructions(): string {
    const jsonSchema = zodToJsonSchema(this.schema);

    jsonSchema.$schema =
      "https://json-schema.org/draft/2020-12/schema";

    return `You must format your output as a JSON value that adheres to a given "JSON Schema" instance.

"JSON Schema" is a declarative language that allows you to annotate and validate JSON documents.

For example, the example "JSON Schema" instance {{"properties": {{"foo": {{"description": "a list of test words", "type": "array", "items": {{"type": "string"}}}}}}, "required": ["foo"]}}
would match an object with one required property, "foo". The "type" property specifies "foo" must be an "array", and the "description" property semantically describes it as a "list of test words". The items within "foo" must be strings.
Thus, the object {{"foo": ["bar", "baz"]}} is a well-formatted instance of this example "JSON Schema". The object {{"properties": {{"foo": ["bar", "baz"]}}}} is notwell-formatted.

Your output will be parsed and type-checked according to the provided schema instance, so make sure all fields in your output match the schema exactly and there are no trailing commas!

Here is the JSON Schema instance your output must adhere to. Include the enclosing markdown codeblock:
\`\`\`json
${JSON.stringify(jsonSchema)}
\`\`\``;
  }

  /**
   * Parse and validate LLM output.
   */
  async parse(text: string): Promise<z.infer<T>> {
    let json: string;

    // Step 1: Extract JSON from the LLM response.
    try {
      json = extractJson(text);
    } catch (error) {
      if (error instanceof JsonExtractionError) {
        const isInvalidJson =
          error.message.includes("not valid JSON") ||
          error.message.includes("incomplete");

        throw new OutputParserException(
          `Failed to extract JSON. Text: "${text}". Error: ${error.message}`,
          {
            code: isInvalidJson
              ? "INVALID_JSON"
              : "INVALID_FORMAT",
            llmOutput: text,
            observation: error.message,
            cause: error,
          },
        );
      }

      throw new OutputParserException(
        `Failed to extract JSON. Text: "${text}". Error: ${String(error)}`,
        {
          code: "INVALID_FORMAT",
          llmOutput: text,
          observation:
            error instanceof Error
              ? error.message
              : String(error),
          cause: error,
        },
      );
    }

    // Step 2: Parse JSON.
    let parsed: unknown;

    try {
      parsed = JSON.parse(json);
    } catch (error) {
      throw new OutputParserException(
        `Failed to parse JSON. Text: "${text}". Error: ${String(error)}`,
        {
          code: "INVALID_JSON",
          llmOutput: text,
          observation:
            error instanceof Error
              ? error.message
              : String(error),
          cause: error,
        },
      );
    }

    // Step 3: Validate against the Zod schema.
    try {
      return await this.schema.parseAsync(parsed);
    } catch (error) {
      throw new OutputParserException(
        `Failed to validate output. Text: "${text}". Error: ${String(error)}`,
        {
          code: "SCHEMA_VALIDATION",
          llmOutput: text,
          observation:
            error instanceof Error
              ? error.message
              : String(error),
          cause: error,
        },
      );
    }
  }
}
