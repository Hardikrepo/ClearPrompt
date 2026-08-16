export interface FormatTarget {
  id: string;
  name: string;
  description: string;
  /** The system prompt sent to the AI model to perform the rewrite for this target. */
  instructions: string;
}
