import { type ContextFacts } from "../types"
import { websiteItems } from "../url"

export type ProposalSectionKey = "aliases" | "products" | "summary" | "websites"

export type ProposalSectionStatus = "changed" | "unchanged"

export type ProposalSectionStatuses = Record<
  ProposalSectionKey,
  ProposalSectionStatus
>

export const emptyFacts: ContextFacts = {
  aliases: [],
  domains: [],
  name: undefined,
  products: [],
  summary: undefined,
}

export function proposalStatuses(
  current: ContextFacts | null,
  proposed: ContextFacts,
  primaryWebsite: string | undefined
): ProposalSectionStatuses {
  const approved = approvedFacts(current)

  return {
    aliases: statusFor(
      listValues(approved.aliases),
      listValues(proposed.aliases)
    ),
    products: statusFor(productValues(approved), productValues(proposed)),
    summary: statusFor(summaryValues(approved), summaryValues(proposed)),
    websites: statusFor(
      websiteValues(approved, primaryWebsite),
      websiteValues(proposed, primaryWebsite)
    ),
  }
}

export function approvedFacts(current: ContextFacts | null): ContextFacts {
  return current ?? emptyFacts
}

function statusFor(left: string[], right: string[]): ProposalSectionStatus {
  return sameValues(left, right) ? "unchanged" : "changed"
}

function summaryValues(facts: ContextFacts) {
  return [
    taggedValue("name", facts.name),
    taggedValue("summary", facts.summary),
  ].filter((value): value is string => value !== null)
}

function productValues(facts: ContextFacts) {
  return facts.products
    .map((product) =>
      [product.name, product.description]
        .map((value) => value.trim())
        .join("\n")
    )
    .filter((value) => value.trim() !== "")
    .sort()
}

function listValues(values: string[]) {
  return values
    .map((value) => value.trim())
    .filter((value) => value !== "")
    .sort()
}

function websiteValues(
  facts: ContextFacts,
  primaryWebsite: string | undefined
) {
  return websiteItems(facts.domains, primaryWebsite)
    .map((website) => website.key)
    .sort()
}

function taggedValue(key: string, value: string | undefined) {
  const trimmed = value?.trim()

  return trimmed === undefined || trimmed === "" ? null : `${key}:${trimmed}`
}

function sameValues(left: string[], right: string[]) {
  return (
    left.map(normalizeValue).join("\n") === right.map(normalizeValue).join("\n")
  )
}

function normalizeValue(value: string) {
  return value.trim().toLowerCase()
}
