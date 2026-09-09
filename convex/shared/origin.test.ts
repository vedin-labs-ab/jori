import { describe, expect, test } from "vitest"
import { readOrigin, readPublicOrigin, readRegion } from "./origin"

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

test.each([
  "https://jori.example/welcome",
  "https://user:password@jori.example",
  "https://jori.example?next=/console",
  "https://jori.example#console",
  "ftp://jori.example",
  "not a URL",
])("rejects invalid configured origins: %s", (origin) => {
  expect(() => readOrigin({ JORI_APP_URL: origin })).toThrow(
    `JORI_APP_URL must be an http(s) origin, received ${JSON.stringify(origin)}.`
  )
  expect(() => readPublicOrigin({ JORI_PUBLIC_ORIGIN: origin })).toThrow(
    `JORI_PUBLIC_ORIGIN must be an http(s) origin, received ${JSON.stringify(origin)}.`
  )
})

test("keeps unconfigured origins optional and trims configured values", () => {
  expect(readOrigin({})).toBeUndefined()
  expect(readPublicOrigin({ JORI_PUBLIC_ORIGIN: "  " })).toBeUndefined()
  expect(readOrigin({ JORI_APP_URL: "  http://localhost:5173///  " })).toBe(
    "http://localhost:5173"
  )
})
