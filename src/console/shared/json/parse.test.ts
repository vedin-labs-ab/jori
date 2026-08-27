import { expect, test } from "vitest"
import { formatJsonText, parseJsonText } from "./parse"

test("parses valid JSON", () => {
  expect(parseJsonText('{"a": [1, true]}')).toEqual({
    ok: true,
    value: { a: [1, true] },
  })
})

test("rejects empty input with a prompt to enter a value", () => {
  const parsed = parseJsonText("   ")

  expect(parsed.ok).toBe(false)

  if (!parsed.ok) {
    expect(parsed.error).toBe("Enter a JSON value.")
  }
})

test("surfaces the syntax error for invalid JSON", () => {
  const parsed = parseJsonText("{oops}")

  expect(parsed.ok).toBe(false)

  if (!parsed.ok) {
    expect(parsed.error).not.toBe("")
  }
})

test("formats values back into editable text", () => {
  const text = formatJsonText({ a: 1 })

  expect(parseJsonText(text)).toEqual({ ok: true, value: { a: 1 } })
  expect(formatJsonText(undefined)).toBe("")
})
