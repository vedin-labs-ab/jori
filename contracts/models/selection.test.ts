import { expect, test } from "vitest"
import { catalogModel, isModelSlug } from "./catalog"
import {
  defaultSelection,
  reasoningEfforts,
  selectionLabel,
  selectionTier,
  tierOrder,
  tiers,
  withEffort,
  withModel,
} from "./selection"

test("every tier names a catalog model at an offered effort", () => {
  for (const tier of tierOrder) {
    const selection = tiers[tier]

    expect(isModelSlug(selection.model)).toBe(true)
    expect(reasoningEfforts).toContain(selection.effort)
    expect(catalogModel(selection.model).reasoning).toBe(true)
    expect(selectionTier(selection)).toBe(tier)
  }

  expect(defaultSelection).toEqual(tiers.standard)
})

test("a selection reads as its tier, or as its model and effort when it is none", () => {
  expect(selectionLabel(tiers.premium)).toBe("Premium")
  expect(
    selectionLabel(withModel(tiers.premium, "anthropic/claude-sonnet-5"))
  ).toBe("Claude Sonnet 5 · High")
  expect(withEffort(tiers.standard, "max")).toEqual({
    model: "openai/gpt-5.6-sol",
    effort: "max",
  })
  expect(selectionTier({ model: "openai/gpt-6-astra", effort: "medium" })).toBe(
    null
  )
})
