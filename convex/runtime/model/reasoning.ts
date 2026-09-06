/** Whether a model's reasoning is kept as it comes: OpenAI models expose
 *  provider summaries, which are safe to store and to show as they stream.
 *  Raw chain of thought from other models is not; a summary of it may be
 *  stored here in future. */
export function readsReasoning(model: string) {
  return model.startsWith("openai/")
}

export function ingestReasoning(
  model: string,
  reasoningText: unknown
): string | null {
  return readsReasoning(model) ? nullableText(reasoningText) : null
}

export function nullableText(value: unknown) {
  return typeof value === "string" && value.trim() !== "" ? value : null
}
