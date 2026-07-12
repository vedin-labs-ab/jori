export type ReasoningDisclosure = "summary" | "raw"

export function reasoningDisclosure(model: string): ReasoningDisclosure {
  return model.startsWith("openai/") ? "summary" : "raw"
}

export function ingestReasoning(
  model: string,
  reasoningText: unknown
): string | null {
  if (reasoningDisclosure(model) === "summary") {
    return nullableText(reasoningText)
  }

  // Future: summarize raw CoT and store the summary here.
  return null
}

export function nullableText(value: unknown) {
  return typeof value === "string" && value.trim() !== "" ? value : null
}
