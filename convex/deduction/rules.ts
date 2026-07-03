import { minSupportDaySpan, minSupportSources } from "./limits"
import { type Citation, type JudgeOp } from "./review/ops"
import { type BeliefStatus } from "./schema"

// Deterministic guardrails around the judge: the judge proposes, these rules
// dispose. Everything here is pure so every branch stays unit-tested.

export type SourceRecord = { observedAt: number; integrationId: string }

export type AllowedSources = {
  events: Map<string, SourceRecord>
  conversations: Map<string, SourceRecord>
}

export type Sighting = {
  citation: Citation
  observedAt: number
  integrationId: string
}

// Every citation must reference the pass's own input; one unknown id
// invalidates the whole op, so a hallucinated claim never partially lands.
export function resolveCitations(
  citations: Citation[],
  allowed: AllowedSources
): Sighting[] | null {
  const sightings: Sighting[] = []

  for (const citation of citations) {
    const record =
      "event" in citation
        ? allowed.events.get(citation.event)
        : allowed.conversations.get(citation.conversation)

    if (record === undefined) {
      return null
    }

    sightings.push({ citation, ...record })
  }

  return sightings
}

// Assertions about work need support; status and merge may ride on evidence
// already accumulated.
export function requiresCitations(op: JudgeOp) {
  return op.op === "create" || op.op === "update" || op.op === "journal"
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

// Promotion needs support from at least minSupportSources integrations, or
// sightings spanning minSupportDaySpan. The judge's intent alone never
// confirms a belief.
export function hasConfirmSupport(support: SourceRecord[]) {
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
export function sortOps(ops: JudgeOp[]) {
  return [
    ...ops.filter((op) => op.op === "create"),
    ...ops.filter((op) => op.op !== "create"),
  ]
}

export function maxObservedAt(sightings: Sighting[]) {
  return sightings.reduce(
    (latest, sighting) => Math.max(latest, sighting.observedAt),
    0
  )
}
