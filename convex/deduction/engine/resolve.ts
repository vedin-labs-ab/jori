import { type Doc, type Id } from "../../_generated/dataModel"
import { type MutationCtx, type QueryCtx } from "../../_generated/server"
import { type BeliefKind } from "../schema"
import { type SupportRecord } from "./rules"

// Resolve a wire id to a live row of the pass's organization: temp ids minted by
// this pass first, then real document ids. Superseded rows are out of the
// roster and never valid targets.

export async function resolveEffort(
  ctx: MutationCtx,
  organizationId: string,
  temp: Map<string, Id<"efforts">>,
  raw: string
): Promise<Doc<"efforts"> | null> {
  const id = temp.get(raw) ?? ctx.db.normalizeId("efforts", raw)

  if (id === null) {
    return null
  }

  const doc = await ctx.db.get(id)

  return doc !== null &&
    doc.organizationId === organizationId &&
    doc.supersededBy === undefined
    ? doc
    : null
}

export async function resolveBelief(
  ctx: MutationCtx,
  organizationId: string,
  kind: BeliefKind,
  temp: Map<string, Id<"beliefs">>,
  raw: string
): Promise<Doc<"beliefs"> | null> {
  const id = temp.get(raw) ?? ctx.db.normalizeId("beliefs", raw)

  if (id === null) {
    return null
  }

  const doc = await ctx.db.get(id)

  return doc !== null &&
    doc.organizationId === organizationId &&
    doc.kind === kind &&
    doc.supersededBy === undefined
    ? doc
    : null
}

// A belief's support is the evidence of its assigned efforts, resolved back
// to source integrations. Transitive by design: belief evidence cites
// efforts, effort evidence cites source records.
export async function loadBeliefSupport(
  ctx: QueryCtx,
  beliefId: Id<"beliefs">
): Promise<SupportRecord[]> {
  const efforts = await ctx.db
    .query("efforts")
    .withIndex("by_workstream", (index) => index.eq("workstreamId", beliefId))
    .collect()
  const records: SupportRecord[] = []

  for (const effort of efforts) {
    records.push(...(await loadEffortSupport(ctx, effort._id)))
  }

  return records
}

export async function loadEffortSupport(
  ctx: QueryCtx,
  effortId: Id<"efforts">
): Promise<SupportRecord[]> {
  const rows = await ctx.db
    .query("evidence")
    .withIndex("by_subject_effort_id", (index) =>
      index.eq("subject.effortId", effortId)
    )
    .collect()
  const records: SupportRecord[] = []

  for (const row of rows) {
    const source = await loadSource(ctx, row)

    if (source !== null) {
      records.push({
        observedAt: row.observedAt,
        integrationId: source.integrationId,
      })
    }
  }

  return records
}

async function loadSource(ctx: QueryCtx, row: Doc<"evidence">) {
  if (row.reference.kind === "event") {
    return await ctx.db.get(row.reference.eventId)
  }

  if (row.reference.kind === "conversation") {
    return await ctx.db.get(row.reference.conversationId)
  }

  return null
}
