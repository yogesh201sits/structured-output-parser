import { describe, expect, test } from "bun:test";
import Groq from "groq-sdk";
import { z } from "zod";

import {
  JsonMarkdownStructuredOutputParser,
  StructuredOutputParser,
} from "../../src";

const apiKey = process.env.GROQ_API_KEY;

const describeIntegration = apiKey
  ? describe
  : describe.skip;

describeIntegration("Groq integration", () => {
  const groq = new Groq({
    apiKey,
  });

  test("parses structured output from a real Groq response", async () => {
    const parser = StructuredOutputParser.fromZodSchema(
      z.object({
        name: z.string(),
        age: z.number(),
        occupation: z.string(),
      }),
    );

    const prompt = `
Extract the person's information from the text below.

${parser.getFormatInstructions()}

Text:
John is a 25 year old software engineer.
`;

    const completion =
      await groq.chat.completions.create({
        model: "openai/gpt-oss-20b",
        temperature: 0,
        messages: [
          {
            role: "system",
            content:
              "You extract information exactly according to the requested schema. Follow the format instructions.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      });

    const response =
      completion.choices[0]?.message?.content;

    expect(response).toBeTruthy();

    const result = await parser.parse(response!);

    expect(result.name).toBe("John");
    expect(result.age).toBe(25);
    expect(result.occupation).toBe(
      "software engineer",
    );
  });

  test("parses markdown structured output from a real Groq response", async () => {
    const parser =
      new JsonMarkdownStructuredOutputParser(
        z.object({
          name: z.string(),
          age: z.number(),
          occupation: z.string(),
        }),
      );

    const prompt = `
Extract the person's information from the text below.

${parser.getFormatInstructions()}

Text:
Sarah is a 30 year old data scientist.

Return only the requested format.
`;

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

    expect(response).toBeTruthy();

    const result = await parser.parse(response!);

    expect(result.name).toBe("Sarah");
    expect(result.age).toBe(30);
    expect(result.occupation).toBe(
      "data scientist",
    );
  });
});