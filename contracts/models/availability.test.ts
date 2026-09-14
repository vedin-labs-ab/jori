import { expect, test } from "vitest"
import { modelAvailabilityReason } from "./availability"
import { defaultSelection, tiers } from "./selection"

test("unknown, empty and ineligible catalogs explain the model choices", () => {
  expect(modelAvailabilityReason(undefined, defaultSelection)).toContain(
    "Loading"
  )
  expect(modelAvailabilityReason([], defaultSelection)).toContain(
    "No model choices"
  )
  expect(
    modelAvailabilityReason([defaultSelection.model], tiers.premium)
  ).toContain("Choose")
  expect(
    modelAvailabilityReason([defaultSelection.model], defaultSelection)
  ).toBeUndefined()
})
