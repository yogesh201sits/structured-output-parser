export class OutputParserException extends Error {
  /**
   * The original output produced by the LLM.
   */
  readonly llmOutput?: string;

  /**
   * Additional information describing what went wrong.
   */
  readonly observation?: string;

  constructor(
    message: string,
    llmOutput?: string,
    observation?: string,
  ) {
    super(message);

    this.name = "OutputParserException";
    this.llmOutput = llmOutput;
    this.observation = observation;

    Object.setPrototypeOf(this, new.target.prototype);
  }
}