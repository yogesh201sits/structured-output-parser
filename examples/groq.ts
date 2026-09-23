/// <reference types="node" />

import Groq from "groq-sdk";
import { z } from "zod";

import {
  JsonMarkdownStructuredOutputParser,
  StructuredOutputParser,
} from "../src";

const apiKey = process.env.GROQ_API_KEY;

if (!apiKey) {
  console.error("Missing GROQ_API_KEY.");
  process.exit(1);
}

const groq = new Groq({
  apiKey,
});

async function main() {
  console.log("========================================");
  console.log("Structured Output Parser + Groq");
  console.log("========================================");

  const schema = z.object({
    name: z.string(),
    age: z.number(),
    occupation: z.string(),
  });

  const parser =
    StructuredOutputParser.fromZodSchema(schema);

  console.log("\n[1] Generated format instructions:");
  console.log("----------------------------------------");
  console.log(parser.getFormatInstructions());

  const prompt = `
Extract the person's information from the text below.

${parser.getFormatInstructions()}

Text:
John is a 25 year old software engineer.

Return the information according to the provided format instructions.
`;

  console.log("\n[2] Sending request to Groq...");
  console.log("----------------------------------------");

  const completion =
    await groq.chat.completions.create({
      model: "openai/gpt-oss-20b",
      temperature: 0,
      messages: [
        {
          role: "system",
          content:
            "Extract information according to the provided format instructions.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

  const response =
    completion.choices[0]?.message?.content;

  if (!response) {
    throw new Error("Groq returned an empty response.");
  }

  console.log("\n[3] Raw Groq response:");
  console.log("----------------------------------------");
  console.log(response);

  console.log("\n[4] Parsing response...");
  console.log("----------------------------------------");

  const result = await parser.parse(response);

  console.log("\n[5] Parsed and validated result:");
  console.log("----------------------------------------");
  console.log(result);

  console.log("\n[6] Individual fields:");
  console.log("----------------------------------------");
  console.log("Name:", result.name);
  console.log("Age:", result.age);
  console.log("Occupation:", result.occupation);

  console.log("\n✓ StructuredOutputParser worked successfully.");
}

main().catch((error) => {
  console.error("\n✗ Integration failed.");

  if (error instanceof Error) {
    console.error(error.message);
    console.error(error.stack);
  } else {
    console.error(error);
  }

  process.exit(1);
});