import { expect, test } from "vitest"
import { models } from "../../contracts/models/catalog"
import {
  reasoningEfforts,
  tierOrder,
  tiers,
} from "../../contracts/models/selection"
import { modelSelectionValidator, runModel, runSelection } from "./selection"

test("the validator admits exactly the catalog's slugs and the offered efforts", () => {
  const slugs = modelSelectionValidator.fields.model.members.map(
    (member) => member.value
  )
  const efforts = modelSelectionValidator.fields.effort.members.map(
    (member) => member.value
  )

  expect(slugs).toEqual(models.map((model) => model.slug))
  expect(efforts).toEqual([...reasoningEfforts])

  for (const tier of tierOrder) {
    expect(slugs).toContain(tiers[tier].model)
    expect(efforts).toContain(tiers[tier].effort)
  }
})

test("a row without a selection runs on the default", () => {
  expect(runSelection({})).toEqual(tiers.standard)
  expect(runModel({ model: tiers.premium })).toBe("openai/gpt-6-astra")
})
