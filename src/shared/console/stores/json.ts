// The stores JSON editors share one contract: a parse either yields the
// value or a message the field can show inline.

export type JsonParseResult =
  | { ok: true; value: unknown }
  | { ok: false; error: string }

export function parseJsonText(text: string): JsonParseResult {
  if (text.trim() === "") {
    return { ok: false, error: "Enter a JSON value." }
  }

  try {
    return { ok: true, value: JSON.parse(text) }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Invalid JSON.",
    }
  }
}

export function formatJsonText(value: unknown) {
  return JSON.stringify(value, null, 2) ?? ""
}
