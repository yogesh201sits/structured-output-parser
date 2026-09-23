import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

import { StructuredOutputParser } from "./structured";

type AnyZodSchema = z.ZodTypeAny;

export class JsonMarkdownStructuredOutputParser<
  T extends AnyZodSchema,
> extends StructuredOutputParser<T> {
  /**
   * Generate instructions that ask the LLM to return
   * the JSON object inside a Markdown code block.
   */
  override getFormatInstructions(): string {
    const jsonSchema = zodToJsonSchema(this.schema);

    return `Return a markdown code snippet with a JSON object formatted to look like:
\`\`\`json
${JSON.stringify(jsonSchema)}
\`\`\``;
  }
}