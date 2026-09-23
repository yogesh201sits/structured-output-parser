import { z } from "zod";
import {
  OutputParserException,
  StructuredOutputParser,
} from "./index";

const parser = StructuredOutputParser.fromZodSchema(
  z.object({
    name: z.string().describe("The person's name"),
    age: z.number().describe("The person's age"),
    occupation: z.string().describe("The person's occupation"),
  }),
);

// 1. Valid JSON
const validOutput = `
\`\`\`json
{
  "name": "John",
  "age": 25,
  "occupation": "software engineer"
}
\`\`\`
`;

console.log("TEST 1: VALID OUTPUT");

const result = await parser.parse(validOutput);

console.log(result);


// 2. Invalid JSON
const invalidJson = `
\`\`\`json
{
  "name": "John",
  "age": 25,
  "occupation": "software engineer",
\`\`\`
`;

console.log("\nTEST 2: INVALID JSON");

try {
  await parser.parse(invalidJson);
} catch (error) {
  console.log(error instanceof OutputParserException);

  if (error instanceof Error) {
    console.log(error.message);
  }
}


// 3. Schema validation failure
const invalidSchema = `
\`\`\`json
{
  "name": "John",
  "age": "twenty five",
  "occupation": "software engineer"
}
\`\`\`
`;

console.log("\nTEST 3: SCHEMA VALIDATION FAILURE");

try {
  await parser.parse(invalidSchema);
} catch (error) {
  console.log(error instanceof OutputParserException);

  if (error instanceof Error) {
    console.log(error.message);
  }
}