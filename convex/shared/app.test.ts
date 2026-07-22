import { describe, expect, test } from "vitest"
import { readAppOrigin, readAppRegion } from "./app"

describe("application deployment configuration", () => {
  test("reads the regional deployment identity", () => {
    expect(readAppRegion({ MILO_REGION: "us" })).toBe("us")
    expect(readAppRegion({ MILO_REGION: " eu " })).toBe("eu")
  })

  test("rejects unknown regions", () => {
    expect(() => readAppRegion({ MILO_REGION: "global" })).toThrow(
      'MILO_REGION must be "us" or "eu".'
    )
  })

  test("normalizes a configured application origin", () => {
    expect(readAppOrigin({ MILO_APP_URL: "https://us.milo.example/" })).toBe(
      "https://us.milo.example"
    )
  })
})
