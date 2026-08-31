import { describe, expect, test } from "vitest"
import { decodeJson } from "."
import { decodeToolInput, encodeToolInput, encodeToolResult } from "./transport"

describe("tool JSON transport", () => {
  test("round-trips input through a single encoded string", () => {
    const input = {
      properties: {
        "Företag 😀": {
          title: [{ text: { content: "Vedin Labs" } }],
        },
        ÅÄÖ: {
          rich_text: [{ text: { content: "Ready" } }],
        },
      },
    }

    expect(decodeToolInput(encodeToolInput(input))).toEqual(input)
  })

  test("normalizes undefined tool results to json null", () => {
    expect(decodeJson(encodeToolResult(undefined))).toBeNull()
  })
})
