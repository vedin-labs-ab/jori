import { defineTable } from "convex/server"
import { type Infer, v } from "convex/values"

// One row per integration import: status, cursor, and ledger in one place,
// mirroring how deduction passes carry their own bookkeeping. Cursors are
// provider-shaped: GitHub walks repositories by page number, Linear walks one
// GraphQL connection by cursor.
const githubCursor = v.object({
  repositories: v.array(v.string()),
  repository: v.number(),
  page: v.number(),
})

const linearCursor = v.object({
  after: v.union(v.string(), v.null()),
})

export const backfillCursor = v.union(githubCursor, linearCursor)
export type BackfillCursor = Infer<typeof backfillCursor>

const backfillStatus = v.union(
  v.literal("running"),
  v.literal("completed"),
  v.literal("failed")
)

export const backfills = defineTable({
  organizationId: v.string(),
  integrationId: v.id("integrations"),
  status: backfillStatus,
  window: v.object({ start: v.number(), end: v.number() }),
  cursor: v.optional(backfillCursor),
  stats: v.object({
    events: v.number(),
    duplicates: v.number(),
    steps: v.number(),
  }),
  error: v.optional(v.string()),
  startedAt: v.number(),
  endedAt: v.optional(v.number()),
})
  .index("by_organization", ["organizationId"])
  .index("by_integration", ["integrationId"])
