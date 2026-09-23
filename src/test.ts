import { z } from "zod";
import { StructuredOutputParser } from "./output-parsers/structured";

const parser = StructuredOutputParser.fromZodSchema(
  z.object({
    name: z.string().describe("The person's name"),
    age: z.number().describe("The person's age"),
    occupation: z.string().describe("The person's occupation"),
  }),
);

const formatInstructions = parser.getFormatInstructions();

console.log(formatInstructions);