import { expect, test } from "vitest"
import { modelAvailabilityReason } from "./availability"
import { defaultSelection, tiers } from "./selection"

test("unknown, empty and ineligible catalogs disable sending with distinct reasons", () => {
  expect(modelAvailabilityReason(undefined, defaultSelection)).toContain(
    "Checking"
  )
  expect(modelAvailabilityReason([], defaultSelection)).toContain("unavailable")
  expect(
    modelAvailabilityReason([defaultSelection.model], tiers.premium)
  ).toContain("Choose")
  expect(
    modelAvailabilityReason([defaultSelection.model], defaultSelection)
  ).toBeUndefined()
})
