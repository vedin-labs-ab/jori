const overflowPattern =
  /context_length_exceeded|context length|context window|too many tokens|prompt is too long|maximum context/i

/**
 * Whether a provider error says the prompt itself no longer fits, as
 * distinct from a failure a retry might get past. Read off the error's
 * shape rather than its class: the SDK's error classes pull the whole
 * model catalogue in with them, which the loop's steps cannot afford.
 */
export function isContextOverflow(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return false
  }

  const record = error as Record<string, unknown>

  if (record.statusCode === 413) {
    return true
  }

  return [record.message, record.body].some(
    (field) => typeof field === "string" && overflowPattern.test(field)
  )
}
