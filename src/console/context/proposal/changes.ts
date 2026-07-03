import { type ContextFacts, type ContextSource } from "../types"
import { websiteItems } from "../url"

type ProposalSectionKey = "aliases" | "sources" | "summary" | "websites"

export type ProposalSectionStatus = "changed" | "unchanged"

export type ProposalSectionStatuses = Record<
  ProposalSectionKey,
  ProposalSectionStatus
>

const emptyFacts: ContextFacts = {
  aliases: [],
  domains: [],
  name: undefined,
  summary: undefined,
}

export function proposalStatuses(
  current: ContextFacts | null,
  proposed: ContextFacts,
  input: {
    currentSources: ContextSource[] | undefined
    currentWebsite: string | undefined
    proposedSources: ContextSource[] | undefined
    proposedWebsite: string | undefined
  }
): ProposalSectionStatuses {
  const approved = approvedFacts(current)

  return {
    aliases: statusFor(
      listValues(approved.aliases),
      listValues(proposed.aliases)
    ),
    sources: statusFor(
      sourceValues(input.currentSources),
      sourceValues(input.proposedSources)
    ),
    summary: statusFor(summaryValues(approved), summaryValues(proposed)),
    websites: statusFor(
      websiteValues(approved, input.currentWebsite),
      websiteValues(proposed, input.proposedWebsite)
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

function sourceValues(sources: ContextSource[] | undefined) {
  return (sources ?? [])
    .map((source) =>
      [source.url, String(source.primary)]
        .map((value) => value.trim())
        .join("\n")
    )
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
