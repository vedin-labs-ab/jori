import { type ObjectType, v } from "convex/values"
import { runStatus } from "../schema"

export const runScope = v.union(
  v.literal("conversation"),
  v.literal("tenant"),
  v.literal("all")
)

export const runSource = v.union(
  v.literal("slack"),
  v.literal("github"),
  v.literal("linear"),
  v.literal("automation")
)

export const activityFilter = v.union(
  v.literal("tool"),
  v.literal("model"),
  v.literal("approval"),
  v.literal("asset"),
  v.literal("agent"),
  v.literal("error")
)

export const searchRunsArgs = {
  query: v.optional(v.string()),
  scope: v.optional(runScope),
  status: v.optional(runStatus),
  source: v.optional(runSource),
  since: v.optional(v.number()),
  until: v.optional(v.number()),
  rootId: v.optional(v.string()),
  parentId: v.optional(v.string()),
  runIds: v.optional(v.array(v.string())),
  cursor: v.optional(v.string()),
  limit: v.optional(v.number()),
}

export const searchRunActivityArgs = {
  runId: v.string(),
  filter: v.optional(v.array(activityFilter)),
  cursor: v.optional(v.string()),
  limit: v.optional(v.number()),
}

export type SearchRunActivityArgs = ObjectType<typeof searchRunActivityArgs>
export type SearchRunsArgs = ObjectType<typeof searchRunsArgs>
