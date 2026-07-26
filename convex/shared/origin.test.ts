import { describe, expect, test } from "vitest"
import { readOrigin, readRegion } from "./origin"

describe("application deployment configuration", () => {
  test("reads the regional deployment identity", () => {
    expect(readRegion({ JORI_REGION: "us" })).toBe("us")
    expect(readRegion({ JORI_REGION: " eu " })).toBe("eu")
  })

  test("rejects unknown regions", () => {
    expect(() => readRegion({ JORI_REGION: "global" })).toThrow(
      'JORI_REGION must be "us" or "eu".'
    )
  })

  test("normalizes a configured application origin", () => {
    expect(readOrigin({ JORI_APP_URL: "https://us.jori.example/" })).toBe(
      "https://us.jori.example"
    )
  })
})
