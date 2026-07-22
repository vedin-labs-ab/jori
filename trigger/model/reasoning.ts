export function ingestReasoning(
  model: string,
  reasoningText: unknown
): string | null {
  if (model.startsWith("openai/")) {
    return nullableText(reasoningText)
  }

  // Future: summarize raw CoT and store the summary here.
  return null
}

export function nullableText(value: unknown) {
  return typeof value === "string" && value.trim() !== "" ? value : null
}
