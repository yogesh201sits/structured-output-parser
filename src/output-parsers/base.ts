export abstract class BaseOutputParser<T = unknown> {
  /**
   * Parse the raw output from an LLM.
   */
  abstract parse(text: string): Promise<T>;

  /**
   * Return instructions describing the expected output format.
   */
  abstract getFormatInstructions(): string;
}