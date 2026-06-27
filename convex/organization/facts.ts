import { type Infer } from "convex/values"
import { type organizationFacts } from "./schema"

export type OrganizationFacts = Infer<typeof organizationFacts>

export const emptyFacts: OrganizationFacts = {
  aliases: [],
  domains: [],
  products: [],
}

// Stable structural comparison so the watcher only proposes a new draft when the
// extracted facts actually differ from what is live — not on cosmetic reordering
// or whitespace from the model.
export function factsEqual(left: OrganizationFacts, right: OrganizationFacts) {
  return serializeFacts(left) === serializeFacts(right)
}

// Compact, prompt-ready block built from approved facts. Returns null when there
// is nothing worth injecting yet.
export function renderContextBlock(facts: OrganizationFacts): string | null {
  const lines = [
    renderIdentityLine(facts),
    clean(facts.summary),
    renderProductsLine(facts),
  ].filter((line): line is string => line !== null)

  return lines.length === 0 ? null : lines.join("\n")
}

function renderIdentityLine(facts: OrganizationFacts) {
  const name = clean(facts.name)

  if (name === null) {
    return null
  }

  const aliases = unique(facts.aliases)
  const domains = unique(facts.domains)
  const suffix = aliases.length === 0 ? "" : ` (aka ${aliases.join(", ")})`
  const trailer = domains.length === 0 ? "" : ` · ${domains.join(", ")}`

  return `Org: ${name}${suffix}${trailer}`
}

function renderProductsLine(facts: OrganizationFacts) {
  const products = facts.products
    .map((product) => `${product.name.trim()} — ${product.description.trim()}`)
    .filter((entry) => entry !== " — ")

  return products.length === 0 ? null : `Products: ${products.join("; ")}`
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
