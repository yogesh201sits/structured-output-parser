export type OutputParserErrorCode =
  | "INVALID_JSON"
  | "SCHEMA_VALIDATION"
  | "INVALID_FORMAT";

export class OutputParserException extends Error {
  readonly code: OutputParserErrorCode;
  readonly llmOutput?: string;
  readonly observation?: string;

  constructor(
    message: string,
    options: {
      code: OutputParserErrorCode;
      llmOutput?: string;
      observation?: string;
      cause?: unknown;
    },
  ) {
    super(message, {
      cause: options.cause,
    });

    this.name = "OutputParserException";
    this.code = options.code;
    this.llmOutput = options.llmOutput;
    this.observation = options.observation;

    Object.setPrototypeOf(this, new.target.prototype);
  }
}