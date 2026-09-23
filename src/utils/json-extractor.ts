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
    const extracted = extractJsonValue(trimmed);

    if (extracted !== null) {
      return extracted;
    }

    throw new JsonExtractionError(
      "Found a JSON-like value, but it is incomplete.",
    );
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
function extractJsonValue(text: string): string | null {
  let foundInvalidCandidate = false;
  let invalidCandidate: string | null = null;
  let foundIncompleteCandidate = false;

  for (let start = 0; start < text.length; start++) {
    const character = text[start];

    if (character !== "{" && character !== "[") {
      continue;
    }

    const result = scanJsonCandidate(text, start);

    if (result === null) {
      foundIncompleteCandidate = true;
      continue;
    }

    if (isValidJson(result)) {
      return result;
    }

    foundInvalidCandidate = true;
    invalidCandidate ??= result;
  }

  if (foundInvalidCandidate || foundIncompleteCandidate) {
    if (invalidCandidate !== null) {
      return invalidCandidate;
    }

    throw new JsonExtractionError(
      "Found a JSON-like value, but it is not valid JSON.",
    );
  }

  return null;
}

function isValidJson(text: string): boolean {
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
}

function scanJsonCandidate(
  text: string,
  start: number,
): string | null {
  const stack: string[] = [];

  let inString = false;
  let escaped = false;

  const openingCharacter = text[start];

  if (
    openingCharacter !== "{" &&
    openingCharacter !== "["
  ) {
    return null;
  }

  stack.push(
    openingCharacter === "{"
      ? "}"
      : "]",
  );

  for (let i = start + 1; i < text.length; i++) {
    const character = text[i];

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

    if (character === "{" || character === "[") {
      stack.push(
        character === "{"
          ? "}"
          : "]",
      );
      continue;
    }

    if (character === "}" || character === "]") {
      const expected = stack[stack.length - 1];

      if (character !== expected) {
        return text.slice(start, i + 1).trim();
      }

      stack.pop();

      if (stack.length === 0) {
        return text.slice(start, i + 1).trim();
      }
    }
  }

  // Opening structure was never closed.
  return null;
}

