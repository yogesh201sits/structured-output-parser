import Groq from "groq-sdk";
import { z } from "zod";

import {
  JsonMarkdownStructuredOutputParser,
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
  console.log("Markdown Structured Output + Groq");
  console.log("========================================");

  const parser =
    new JsonMarkdownStructuredOutputParser(
      z.object({
        name: z.string(),
        age: z.number(),
        occupation: z.string(),
      }),
    );

  console.log("\n[1] Format instructions:");
  console.log("----------------------------------------");
  console.log(parser.getFormatInstructions());

  const prompt = `
Extract the person's information from the text below.

${parser.getFormatInstructions()}

Text:
Sarah is a 30 year old data scientist.

Follow the requested Markdown JSON format exactly.
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
            "Extract the requested information and follow the formatting instructions exactly.",
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

  console.log("\n✓ JsonMarkdownStructuredOutputParser worked successfully.");
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