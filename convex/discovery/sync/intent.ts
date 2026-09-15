import { internal } from "../../_generated/api"
import { type Id, type TableNames } from "../../_generated/dataModel"
import { type MutationCtx, type QueryCtx } from "../../_generated/server"
import { isWorkspaceDeleting } from "../../retention/access"
import { sha256Hex } from "../../shared/crypto"
import { sourceTables } from "../source/types"
/** A durable outbox write in the same transaction as the source edit. Only
 * source rows contend; the shared queue is touched in a separate transaction. */
export async function mark(
  ctx: MutationCtx,
  organizationId: string,
  id: string
) {
  const table = sourceTables.find(
    (table) => ctx.db.normalizeId(table, id) !== null
  )
  if (!table) {
    throw new Error("Unknown discovery source")
  }
  let cascadeHash: string | undefined
  if (["collections", "conversations", "jobs", "runs"].includes(table)) {
    const row = await ctx.db.get(id as Id<TableNames>)
    const fields =
      table === "runs"
        ? [
            "snapshot",
            "job",
            "conversationId",
            "rootId",
            "parentId",
            "audience",
            "createdBy",
            "folderId",
          ]
        : [
            "name",
            "title",
            "columns",
            "schema",
            "archivedAt",
            "visibility",
            "principal",
            "ownerId",
            "createdBy",
            "folderId",
          ]
    cascadeHash = await sha256Hex(
      JSON.stringify(
        row ? fields.map((field) => Reflect.get(row, field) ?? null) : null
      )
    )
  }
  await raise(ctx, organizationId, `${table}:${id}`, cascadeHash)
}
export async function raise(
  ctx: MutationCtx,
  organizationId: string,
  key: string,
  cascadeHash?: string
) {
  if (await isWorkspaceDeleting(ctx, organizationId)) {
    return
  }
  const row = await findSource(ctx, key)
  const cascade = cascadeHash !== undefined && cascadeHash !== row?.cascadeHash
  const now = Date.now(),
    lane = key.startsWith("files:") ? ("file" as const) : ("text" as const)
  const values = {
    organizationId,
    key,
    lane,
    generation: (row?.generation ?? 0) + 1,
    pending: true,
    nextAt: row?.pending ? Math.min(row.nextAt, now + 1000) : now + 1000,
    attempts: 0,
    raisedAt: row?.pending ? row.raisedAt : now,
    ...(cascadeHash ? { cascadeHash } : {}),
    ...(cascade ? { cascade: true, cascadePhase: 0, cascadeCursor: null } : {}),
    error: undefined,
  }
  if (row) {
    await ctx.db.patch(row._id, values)
  } else {
    await ctx.db.insert("discoverySources", values)
  }
  await wake(ctx, organizationId, lane)
}
export function findSource(ctx: Pick<QueryCtx, "db">, key: string) {
  return ctx.db
    .query("discoverySources")
    .withIndex("by_key", (q) => q.eq("key", key))
    .unique()
}
const wakes = new WeakMap<MutationCtx, Set<string>>()
async function wake(
  ctx: MutationCtx,
  organizationId: string,
  lane: "text" | "file"
) {
  let scheduled = wakes.get(ctx)
  if (!scheduled) {
    scheduled = new Set()
    wakes.set(ctx, scheduled)
  }
  const key = `${organizationId}:${lane}`
  if (scheduled.has(key)) {
    return
  }
  scheduled.add(key)
  // Commit the recovery record with the outbox; a failed scheduled wake cannot
  // strand pending sources until the next edit.
  const queue = await ctx.db
    .query("discoveryQueues")
    .withIndex("by_organizationId_and_lane", (q) =>
      q.eq("organizationId", organizationId).eq("lane", lane)
    )
    .unique()
  if (!queue) {
    await ctx.db.insert("discoveryQueues", {
      organizationId,
      lane,
      lease: 0,
      nextAt: Date.now() + 1000,
    })
  }
  await ctx.scheduler.runAfter(1000, internal.discovery.sync.queue.start, {
    organizationId,
    lane,
  })
}
