import { isRecord } from "../../../../contracts/json"

/** Standard regional list prices, USD micros/token, verified 2026-09-07.
 * https://cloud.google.com/gemini-enterprise-agent-platform/generative-ai/pricing
 * Output images cost more than text and thinking; never price them together. */
const rate = { input: 0.55, cached: 0.055, text: 3.3, image: 66 }

export function vertexUsage(value: unknown) {
  if (!isRecord(value)) {
    throw new Error("Vertex response is missing usage metadata.")
  }
  const input = count(value.promptTokenCount)
  const candidates = count(value.candidatesTokenCount)
  const reasoning = count(value.thoughtsTokenCount)
  const cached = count(value.cachedContentTokenCount)
  const details = outputTokens(value.candidatesTokensDetails)
  if (
    input === 0 ||
    cached > input ||
    details.text + details.image !== candidates
  ) {
    throw new Error("Vertex response has inconsistent usage metadata.")
  }

  return {
    micros: Math.ceil(
      (input - cached) * rate.input +
        cached * rate.cached +
        (details.text + reasoning) * rate.text +
        details.image * rate.image
    ),
    tokens: { input, output: candidates + reasoning },
  }
}

function outputTokens(value: unknown) {
  const tokens = { image: 0, text: 0 }
  if (value === undefined) {
    return tokens
  }
  if (!Array.isArray(value)) {
    throw new Error("Vertex response has invalid output token details.")
  }
  for (const detail of value) {
    if (!isRecord(detail)) {
      throw new Error("Vertex response has invalid output token details.")
    }
    if (detail.modality === "IMAGE") {
      tokens.image += count(detail.tokenCount)
    } else if (detail.modality === "TEXT") {
      tokens.text += count(detail.tokenCount)
    } else {
      throw new Error("Vertex response has an unsupported output modality.")
    }
  }
  return tokens
}

function count(value: unknown) {
  // Protobuf JSON omits zero-valued fields.
  if (value === undefined) {
    return 0
  }
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new Error("Vertex response has an invalid token count.")
  }
  return value
}
