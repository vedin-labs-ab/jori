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
    expect(decodeJsonObject(encodeJson(value))).toEqual(value)
  })

  test("rejects non-json values", () => {
    expect(() => toJsonValue({ dropped: undefined })).toThrow(
      "Unsupported JSON value: undefined"
    )
    expect(() => toJsonValue(Number.NaN)).toThrow("JSON numbers must be finite")
  })
})

describe("encodeToolResult", () => {
  test("normalizes a missing tool result to json null", () => {
    expect(decodeJson(encodeToolResult(undefined))).toBeNull()
  })
})
