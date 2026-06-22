import { describe, expect, test } from "vitest"
import { decodeJson, decodeJsonObject, encodeJson, toJsonValue } from "./json"

describe("JSON transport codec", () => {
  test("preserves arbitrary unicode object keys", () => {
    const value = {
      properties: {
        "Company 😀": {
          title: [{ plain_text: "Milo" }],
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
