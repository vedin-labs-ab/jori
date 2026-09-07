import { v } from "convex/values"
import { type Doc, type Id } from "../../_generated/dataModel"

export type RunFilter = "all" | "ongoing" | "failed" | "stopped" | "completed"

export type ApprovalFilter =
  | "any"
  | "pending"
  | "approved"
  | "denied"
  | "expired"
  | "none"

export type ApprovalState =
  | "pending"
  | "approved"
  | "denied"
  | "cancelled"
  | "expired"
  | "failed"

export const runFilterValidator = v.union(
  v.literal("all"),
  v.literal("ongoing"),
  v.literal("failed"),
  v.literal("stopped"),
  v.literal("completed")
)

/** The console's two-way audience facet: what a person keeps to themselves,
 *  and what the whole organization sees. */
export type RunAudienceFilter = "all" | "personal" | "organization"

export const audienceFilterValidator = v.union(
  v.literal("all"),
  v.literal("personal"),
  v.literal("organization")
)

export const approvalFilterValidator = v.union(
  v.literal("any"),
  v.literal("pending"),
  v.literal("approved"),
  v.literal("denied"),
  v.literal("expired"),
  v.literal("none")
)

/**
 * The console shows organization runs to everyone; person and conversation
 * runs only to their creator. Ownerless rows stay open.
 */
export function runVisibleToPerson(
  run: Doc<"runs">,
  personId: Id<"persons"> | undefined
) {
  return (
    run.audience === "organization" ||
    run.createdBy === undefined ||
    run.createdBy === personId
  )
}

/** Conversation runs read as personal: they belong to the thread their
 *  creator was in, not to the organization. */
export function runMatchesAudienceFilter(
  run: Doc<"runs">,
  filter: RunAudienceFilter
) {
  if (filter === "all") {
    return true
  }

  return filter === "organization"
    ? run.audience === "organization"
    : run.audience !== "organization"
}

export function runMatchesFilter(run: Doc<"runs">, filter: RunFilter) {
  if (filter === "all") {
    return true
  }

  if (filter === "ongoing") {
    return run.status === "queued" || run.status === "running"
  }

  return run.status === filter
}

export function approvalMatchesFilter(
  approvalState: ApprovalState | undefined,
  filter: ApprovalFilter
) {
  if (filter === "any") {
    return true
  }

  if (filter === "none") {
    return approvalState === undefined
  }

  return approvalState === filter
}

export function parseCursor(cursor: string | null) {
  if (cursor === null) {
    return 0
  }

  const parsed = Number.parseInt(cursor, 10)

  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

export function normalizeQuery(query: string) {
  return query.trim().toLowerCase()
}

export function summaryMatchesSearch(
  summary: { searchableText: string },
  normalizedQuery: string
) {
  return (
    normalizedQuery === "" || summary.searchableText.includes(normalizedQuery)
  )
}

/** One page of the candidates that match, past the ones earlier pages
 *  served. Deciding whether a candidate matches may already build its
 *  row; the page keeps that row rather than building it again, and a
 *  candidate the offset skips is never built at all. */
export type PageScan<Candidate, Row> = {
  offset: number
  numItems: number
  match: (candidate: Candidate) => Promise<{ row?: Row } | null>
  row: (candidate: Candidate) => Promise<Row>
}

export async function scanPage<Candidate, Row>(
  candidates: AsyncIterable<Candidate>,
  scan: PageScan<Candidate, Row>
) {
  const rows: Row[] = []
  let matchingIndex = 0
  let hasMore = false

  for await (const candidate of candidates) {
    const match = await scan.match(candidate)

    if (match === null) {
      continue
    }

    if (matchingIndex < scan.offset) {
      matchingIndex += 1
      continue
    }

    if (rows.length >= scan.numItems) {
      hasMore = true
      break
    }

    rows.push(match.row ?? (await scan.row(candidate)))
    matchingIndex += 1
  }

  return {
    continueCursor: String(scan.offset + rows.length),
    isDone: !hasMore,
    page: rows,
  }
}

export async function countMatches<Candidate>(
  candidates: AsyncIterable<Candidate>,
  matches: (candidate: Candidate) => Promise<boolean>
) {
  let count = 0

  for await (const candidate of candidates) {
    if (await matches(candidate)) {
      count += 1
    }
  }

  return count
}
