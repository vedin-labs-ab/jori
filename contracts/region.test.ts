import { expect, test } from "vitest"
import { isRegion, regions } from "./region"

test("defines the supported data regions", () => {
  expect(regions).toEqual(["us", "eu"])
  expect(isRegion("us")).toBe(true)
  expect(isRegion("eu")).toBe(true)
})

test("rejects values outside the region contract", () => {
  expect(isRegion("uk")).toBe(false)
  expect(isRegion(undefined)).toBe(false)
})
