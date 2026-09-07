import { expect, test } from "vitest"
import { priceModelTokens } from "../billing"
import {
  catalogModel,
  isModelSlug,
  modelLabel,
  models,
  modelVendors,
  vendorModels,
} from "./catalog"
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

test("every slug is listed once, under a vendor the picker groups by", () => {
  const slugs = models.map((model) => model.slug)

  expect(new Set(slugs).size).toBe(slugs.length)

  for (const model of models) {
    expect(Object.keys(modelVendors)).toContain(model.vendor)
    expect(model.contextLength).toBeGreaterThan(0)
    expect(priceModelTokens(model.slug, { input: 1_000, output: 1_000 })).toBe(
      Math.round(
        1_000 * model.rate.inputMicrosPerToken +
          1_000 * model.rate.outputMicrosPerToken
      )
    )
  }

  expect(vendorModels("openai").length + vendorModels("anthropic").length).toBe(
    models.length
  )
})

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
  expect(modelLabel("openai/gpt-5.4-nano")).toBe("GPT-5.4 Nano")
})

test("a slug outside the catalog is refused, not guessed at", () => {
  expect(isModelSlug("openai/gpt-4")).toBe(false)
  expect(() => catalogModel("openai/gpt-4")).toThrow(
    "openai/gpt-4 is not a model Jori can run on."
  )
})
