import { type Infer } from "convex/values"
import { type organizationFacts } from "./schema"

export type OrganizationFacts = Infer<typeof organizationFacts>

export const emptyFacts: OrganizationFacts = {
  aliases: [],
  domains: [],
  products: [],
}

// The high-value facts that signal whether coverage was good enough. When one is
// still missing after the first pass, discovery does one targeted follow-up to
// fill it rather than settling for a thin draft.
export function missingFacts(facts: OrganizationFacts): string[] {
  const missing: string[] = []

  if (facts.summary === undefined || facts.summary.trim() === "") {
    missing.push("summary")
  }

  if (facts.products.length === 0) {
    missing.push("products")
  }

  return missing
}

// Stable structural comparison so the watcher only proposes a new draft when the
// extracted facts actually differ from what is live — not on cosmetic reordering
// or whitespace from the model.
export function factsEqual(left: OrganizationFacts, right: OrganizationFacts) {
  return serializeFacts(left) === serializeFacts(right)
}

function serializeFacts(facts: OrganizationFacts) {
  return JSON.stringify({
    name: clean(facts.name),
    summary: clean(facts.summary),
    aliases: unique(facts.aliases),
    domains: unique(facts.domains),
    products: [...facts.products]
      .map((product) => ({
        name: product.name.trim(),
        description: product.description.trim(),
      }))
      .sort((left, right) => left.name.localeCompare(right.name)),
  })
}

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()))]
    .filter((value) => value !== "")
    .sort((left, right) => left.localeCompare(right))
}

function clean(value: string | undefined) {
  const trimmed = value?.trim()

  return trimmed === undefined || trimmed === "" ? null : trimmed
}
