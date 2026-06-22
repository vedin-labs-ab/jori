import { describe, expect, test } from "vitest"
import {
  decodeToolInput,
  decodeToolResult,
  encodeToolInput,
  encodeToolResult,
} from "./tool-transport"

describe("tool JSON transport", () => {
  test("uses a single encoded input field", () => {
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

    const transport = encodeToolInput(input)

    expect(Object.keys(transport)).toEqual(["inputJson"])
    expect(decodeToolInput(transport)).toEqual(input)
  })

  test("normalizes undefined tool results to json null", () => {
    expect(decodeToolResult(encodeToolResult(undefined))).toBeNull()
  })
})
