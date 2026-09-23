export class JsonExtractionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "JsonExtractionError";

    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Extract a JSON object or array from text.
 *
 * Supports:
 * - Raw JSON
 * - JSON inside ```json fences
 * - JSON inside generic ``` fences
 * - JSON surrounded by normal prose
 * - Nested objects and arrays
 * - Braces/brackets inside JSON strings
 */
export function extractJson(text: string): string {
  const trimmed = text.trim();

  if (!trimmed) {
    throw new JsonExtractionError("Output is empty.");
  }

  if (trimmed.includes("```")) {
    const fenced = extractFromCodeFence(trimmed);

    if (fenced !== null) {
      return fenced;
    }

    throw new JsonExtractionError(
      "Failed to extract JSON from markdown code block.",
    );
  }

  if (
    trimmed.startsWith("{") ||
    trimmed.startsWith("[")
  ) {
    return extractJsonValue(trimmed) ?? trimmed;
  }

  const extracted = extractJsonValue(trimmed);

  if (extracted !== null) {
    return extracted;
  }

  throw new JsonExtractionError(
    "Could not find a JSON object or array in the output.",
  );
}

/**
 * Extract JSON from a markdown code fence.
 */
function extractFromCodeFence(
  text: string,
): string | null {
  const fencePattern = /```(?:json)?\s*([\s\S]*?)\s*```/gi;

  for (const match of text.matchAll(fencePattern)) {
    const content = match[1]?.trim();

    if (!content) {
      continue;
    }

    /*
     * Return the content without parsing it.
     *
     * This allows StructuredOutputParser to distinguish:
     *
     * extraction → successful
     * JSON.parse → failed
     */
    if (
      content.startsWith("{") ||
      content.startsWith("[")
    ) {
      return content;
    }
  }

  return null;
}

/**
 * Find a complete JSON object or array inside surrounding prose.
 */
function extractJsonValue(
  text: string,
): string | null {
  let start = -1;

  for (let i = 0; i < text.length; i++) {
    const character = text[i];

    if (character === "{" || character === "[") {
      start = i;
      break;
    }
  }

  if (start === -1) {
    return null;
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i++) {
    const character = text[i];

    /*
     * Inside a JSON string, braces and brackets are normal
     * characters and must not affect nesting.
     */
    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (character === "\\") {
        escaped = true;
        continue;
      }

      if (character === '"') {
        inString = false;
      }

      continue;
    }

    if (character === '"') {
      inString = true;
      continue;
    }

    if (
      character === "{" ||
      character === "["
    ) {
      depth++;
      continue;
    }

    if (
      character === "}" ||
      character === "]"
    ) {
      depth--;

      if (depth === 0) {
        return text.slice(start, i + 1).trim();
      }
    }
  }

  /*
   * A JSON opening character was found but no matching
   * closing character was found.
   */
  throw new JsonExtractionError(
    "Incomplete JSON object or array.",
  );
}