import { describe, expect, test } from "vitest"
import {
  decodeJson,
  decodeJsonObject,
  encodeJson,
  encodeToolResult,
  toJsonValue,
} from "."

describe("JSON transport codec", () => {
  test("preserves arbitrary unicode object keys", () => {
    const value = {
      properties: {
        "Company 😀": {
          title: [{ plain_text: "Jori" }],
        },
        ÅÄÖ: {
          rich_text: [{ plain_text: "Swedish letters" }],
        },
        Företag: {
          select: { name: "Vedin Labs" },
        },
      },
    }

    expect(decodeJson(encodeJson(value))).toEqual(value)
    expect(decodeJsonObject(encodeJson(value)).properties).toEqual(
      value.properties
    )
  })

  test("rejects non-json values", () => {
    expect(() => toJsonValue({ dropped: undefined })).toThrow(
      "Unsupported JSON value: undefined"
    )
    expect(() => toJsonValue(Number.NaN)).toThrow("JSON numbers must be finite")
  })
})

describe("encodeToolResult", () => {
  test("round-trips a tool input through a single encoded string", () => {
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

    expect(decodeJsonObject(encodeJson(input))).toEqual(input)
  })

  test("normalizes a missing tool result to json null", () => {
    expect(decodeJson(encodeToolResult(undefined))).toBeNull()
  })
})
