import { describe, expect, test } from "vitest"
import { readOrigin, readRegion } from "./origin"

describe("application deployment configuration", () => {
  test("reads the regional deployment identity", () => {
    expect(readRegion({ MILO_REGION: "us" })).toBe("us")
    expect(readRegion({ MILO_REGION: " eu " })).toBe("eu")
  })

  test("rejects unknown regions", () => {
    expect(() => readRegion({ MILO_REGION: "global" })).toThrow(
      'MILO_REGION must be "us" or "eu".'
    )
  })

  test("normalizes a configured application origin", () => {
    expect(readOrigin({ MILO_APP_URL: "https://us.milo.example/" })).toBe(
      "https://us.milo.example"
    )
  })
})
