<p align="center">
  <img
    width="700"
    src="https://github.com/user-attachments/assets/9701a696-20ad-4cc6-9a3e-4befbc11f221"
    alt="Structured Output Parser"
  />
</p>

<h1 align="center">Structured Output Parser</h1>

<p align="center">
  A lightweight, Zod-based structured output parser for LLM responses.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Bun-runtime-black?style=flat-square&logo=bun" alt="Bun" />
  <img src="https://img.shields.io/badge/TypeScript-typed-blue?style=flat-square&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Zod-schema_validation-3E67B1?style=flat-square" alt="Zod" />
</p>


A lightweight, Zod-based structured output parser for LLM responses.

It converts Zod schemas into JSON Schema format instructions, extracts JSON from LLM responses, parses the JSON, and validates the result against the original Zod schema.

Built to be simple, provider-agnostic, and independent of LangChain.

## Features

* Zod schema validation
* Zod → JSON Schema format instructions
* JSON extraction from plain text and Markdown code blocks
* Automatic JSON parsing
* Runtime schema validation
* Typed TypeScript results
* Structured parser errors
* Markdown JSON parser
* Provider-agnostic design
* No LangChain dependency
* Works with any LLM that returns text

## Installation

```bash
bun add structured-output-parser zod
```

or:

```bash
npm install structured-output-parser zod
```

## Basic Usage

Define a Zod schema:

```ts
import { z } from "zod";
import { StructuredOutputParser } from "structured-output-parser";

const schema = z.object({
  name: z.string(),
  age: z.number(),
  occupation: z.string(),
});

const parser = StructuredOutputParser.fromZodSchema(schema);
```

Generate format instructions:

```ts
const instructions = parser.getFormatInstructions();

console.log(instructions);
```

The generated instructions contain a JSON Schema representation of the Zod schema and tell the model how its output should be formatted.

You can include these instructions in your LLM prompt:

```ts
const prompt = `
Extract the person's information.

${parser.getFormatInstructions()}

Text:
John is a 25 year old software engineer.
`;
```

After receiving the LLM response:

```ts
const result = await parser.parse(llmResponse);

console.log(result);
```

The result is fully validated and typed:

```ts
{
  name: "John",
  age: 25,
  occupation: "software engineer"
}
```

## How It Works

The parser follows a simple pipeline:

```text
Zod Schema
    ↓
JSON Schema
    ↓
Format Instructions
    ↓
LLM
    ↓
Text Response
    ↓
JSON Extraction
    ↓
JSON.parse()
    ↓
Zod Validation
    ↓
Typed Result
```

The parser does not communicate with an LLM itself.

You choose the provider and send the generated instructions using whatever SDK or HTTP client you prefer.

## JSON Extraction

LLMs commonly return JSON in different forms.

Plain JSON:

```json
{
  "name": "John",
  "age": 25
}
```

Markdown fenced JSON:

```json
{
  "name": "John",
  "age": 25
}
```

JSON embedded in text:

```text
Here is the requested information:

{
  "name": "John",
  "age": 25
}
```

The parser extracts the JSON before passing it to `JSON.parse()`.

Extraction and JSON parsing are intentionally separate responsibilities.

This allows the parser to distinguish between:

* JSON that could not be extracted
* JSON that was extracted but is syntactically invalid
* JSON that is valid but does not satisfy the Zod schema

## Schema Validation

Zod performs the final runtime validation.

For example:

```ts
const schema = z.object({
  name: z.string(),
  age: z.number(),
});
```

This response:

```json
{
  "name": "John",
  "age": "25"
}
```

is valid JSON, but fails schema validation because `age` is a string instead of a number.

The parser reports this as a schema validation error.

## Error Handling

The parser exposes `OutputParserException`:

```ts
import {
  OutputParserException,
} from "structured-output-parser";

try {
  const result = await parser.parse(response);

  console.log(result);
} catch (error) {
  if (error instanceof OutputParserException) {
    console.log(error.code);
    console.log(error.message);
    console.log(error.llmOutput);
    console.log(error.observation);
  }
}
```

### Error Codes

| Code                | Meaning                                    |
| ------------------- | ------------------------------------------ |
| `INVALID_FORMAT`    | JSON could not be extracted                |
| `INVALID_JSON`      | JSON was extracted but could not be parsed |
| `SCHEMA_VALIDATION` | JSON was valid but failed Zod validation   |

Example:

```text
INVALID_FORMAT
```

means the parser could not find a complete JSON object or array.

```text
INVALID_JSON
```

means a JSON-looking structure was found, but `JSON.parse()` rejected it.

```text
SCHEMA_VALIDATION
```

means the JSON itself was valid, but its structure or values did not satisfy the Zod schema.

## Markdown Structured Output

For applications where you specifically want the model to return JSON inside a Markdown code block, use `JsonMarkdownStructuredOutputParser`.

```ts
import { z } from "zod";
import {
  JsonMarkdownStructuredOutputParser,
} from "structured-output-parser";

const parser =
  new JsonMarkdownStructuredOutputParser(
    z.object({
      name: z.string(),
      age: z.number(),
      occupation: z.string(),
    }),
  );
```

Its format instructions request:

````text
Return a markdown code snippet with a JSON object formatted to look like:

```json
{
  ...
}
```
````

The same parsing and validation pipeline is then used:

```ts
const result = await parser.parse(llmResponse);
```

## Groq Example

The package is provider-agnostic, but the repository contains a Groq integration example.

Install the SDK:

```bash
bun add -d groq-sdk
```

Set your API key:

```powershell
$env:GROQ_API_KEY="your-api-key"
```

Run:

```bash
bun run examples/groq.ts
```

The example demonstrates:

```text
Zod schema
    ↓
Format instructions
    ↓
Groq
    ↓
LLM response
    ↓
StructuredOutputParser
    ↓
Validated object
```

There is also a Markdown example:

```bash
bun run examples/groq-markdown.ts
```

## Creating a Parser from Field Descriptions

For simple string-based schemas, the parser also supports:

```ts
const parser =
  StructuredOutputParser.fromNamesAndDescriptions({
    name: "The person's name",
    occupation: "The person's occupation",
  });
```

This creates an equivalent Zod object schema internally.

For more control, use `fromZodSchema()` directly.

## TypeScript Types

The parser preserves the inferred Zod type.

```ts
const schema = z.object({
  name: z.string(),
  age: z.number(),
});

const parser =
  StructuredOutputParser.fromZodSchema(schema);

const result = await parser.parse(response);
```

TypeScript understands:

```ts
result.name; // string
result.age;  // number
```

No manual type casting is required.

## Design

The project intentionally keeps the core architecture small.

```text
BaseOutputParser
       │
       ├── StructuredOutputParser
       │
       └── JsonMarkdownStructuredOutputParser
```

Supporting components:

```text
StructuredOutputParser
       │
       ├── zod-to-json-schema
       │
       ├── JSON extractor
       │
       ├── JSON.parse()
       │
       └── Zod validation
```

The parser does not contain:

* LLM provider clients
* agent abstractions
* callbacks
* retry logic
* tool calling
* streaming
* JSON repair
* provider-specific structured-output APIs

This keeps the package focused on one responsibility: **turning LLM text into validated structured data**.

## Why Not Depend on LangChain?

This project follows the useful structured-output concept without depending on the LangChain runtime.

The goal is a small standalone library that can be used with:

* Groq
* OpenAI
* Anthropic
* Gemini
* Ollama
* local models
* custom LLM APIs

The provider only needs to return text.

```text
Any LLM Provider
       ↓
     string
       ↓
StructuredOutputParser
       ↓
Zod-validated result
```

## Current Scope

Implemented:

* [x] Zod schema support
* [x] JSON Schema generation
* [x] Format instructions
* [x] JSON extraction
* [x] Markdown JSON extraction
* [x] JSON parsing
* [x] Zod validation
* [x] Structured errors
* [x] Type-safe results
* [x] Edge-case tests
* [x] Real LLM integration testing

## Out of Scope

The core package intentionally does not implement:

* LLM API calls
* automatic retries
* JSON repair
* streaming parsing
* tool calling
* provider-specific structured output
* agent execution
* evaluation frameworks

These can be built around the parser without making the core parser responsible for them.

## Development

Install dependencies:

```bash
bun install
```

Run type checking:

```bash
bun run typecheck
```

Build:

```bash
bun run build
```

Run tests:

```bash
bun test
```

Run the Groq example:

```bash
bun run examples/groq.ts
```

Run the Markdown example:

```bash
bun run examples/groq-markdown.ts
```

## Project Structure

```text
structured-output-parser/
├── src/
│   ├── errors/
│   │   └── output-parser.ts
│   ├── output-parsers/
│   │   ├── base.ts
│   │   ├── structured.ts
│   │   └── json-markdown.ts
│   ├── utils/
│   │   └── json-extractor.ts
│   └── index.ts
│
├── tests/
│   ├── structured.test.ts
│   ├── types.test.ts
│   ├── json-extractor.test.ts
│   ├── json-markdown.test.ts
│   └── integration/
│       └── groq.test.ts
│
├── examples/
│   ├── groq.ts
│   └── groq-markdown.ts
│
├── package.json
├── tsconfig.json
└── README.md
```

## License

MIT

````

One thing before committing this README: **don't publish yet**. First run:

```powershell
bun run typecheck
bun run build
bun test
````

Then we should do the final **package audit**: `package.json`, generated `dist`, exports, dependency versions, README accuracy, and whether the npm package contains only the files we actually want.
