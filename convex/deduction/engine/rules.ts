import { type Infer, v } from "convex/values"
import { minSupportDaySpan, minSupportSources } from "../limits"
import { type BeliefStatus } from "../schema"

// Deterministic guardrails around the judges: a judge proposes, these rules
// dispose. Everything here is pure so every branch stays unit-tested.

// A citation names exactly one source from the pass's own input. Which kinds
// are citable depends on the stage: effort passes cite events and
// conversations, belief passes cite efforts.
export const citation = v.union(
  v.object({ event: v.string(), why: v.optional(v.string()) }),
  v.object({ conversation: v.string(), why: v.optional(v.string()) }),
  v.object({ effort: v.string(), why: v.optional(v.string()) })
)
export type Citation = Infer<typeof citation>

export type SourceRecord = { observedAt: number; integrationId?: string }

export type AllowedSources = {
  events: Map<string, SourceRecord>
  conversations: Map<string, SourceRecord>
  efforts: Map<string, SourceRecord>
}

export type Sighting = {
  citation: Citation
  observedAt: number
  integrationId?: string
}

// Every citation must reference the pass's own input; one unknown id
// invalidates the whole op, so a hallucinated claim never partially lands.
export function resolveCitations(
  citations: Citation[],
  allowed: AllowedSources
): Sighting[] | null {
  const sightings: Sighting[] = []

  for (const citation of citations) {
    const record = allowedRecord(citation, allowed)

    if (record === undefined) {
      return null
    }

    sightings.push({ citation, ...record })
  }

  return sightings
}

function allowedRecord(citation: Citation, allowed: AllowedSources) {
  if ("event" in citation) {
    return allowed.events.get(citation.event)
  }

  if ("conversation" in citation) {
    return allowed.conversations.get(citation.conversation)
  }

  return allowed.efforts.get(citation.effort)
}

const statusTransitions: Record<string, BeliefStatus[]> = {
  confirm: ["proposed"],
  close: ["proposed", "confirmed"],
  reject: ["proposed"],
  reopen: ["closed"],
}

export function legalStatusTransition(
  from: BeliefStatus,
  to: "confirm" | "close" | "reject" | "reopen"
) {
  return statusTransitions[to]?.includes(from) ?? false
}

export function statusAfterTransition(
  to: "confirm" | "close" | "reject" | "reopen"
): BeliefStatus {
  if (to === "confirm" || to === "reopen") {
    return "confirmed"
  }

  return to === "close" ? "closed" : "rejected"
}

export type SupportRecord = { observedAt: number; integrationId: string }

// Promotion needs support from at least minSupportSources integrations, or
// sightings spanning minSupportDaySpan. The judge's intent alone never
// confirms a belief.
export function hasConfirmSupport(support: SupportRecord[]) {
  const integrations = new Set(support.map((record) => record.integrationId))

  if (integrations.size >= minSupportSources) {
    return true
  }

  if (support.length < 2) {
    return false
  }

  const observed = support.map((record) => record.observedAt)

  return Math.max(...observed) - Math.min(...observed) >= minSupportDaySpan
}

// Creates resolve first so later ops can reference their temp ids; order is
// otherwise preserved.
export function sortOps<Op extends { op: string }>(ops: Op[]) {
  return [
    ...ops.filter((op) => op.op === "create"),
    ...ops.filter((op) => op.op !== "create"),
  ]
}

export function maxObservedAt(sightings: { observedAt: number }[]) {
  return sightings.reduce(
    (latest, sighting) => Math.max(latest, sighting.observedAt),
    0
  )
}

export function mergeTokens(
  current: string[],
  added: Iterable<string>,
  cap: number
) {
  return [...new Set([...current, ...added])].sort().slice(0, cap)
}
