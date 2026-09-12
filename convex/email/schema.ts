import { defineTable } from "convex/server"
import { type Infer, v } from "convex/values"

export const message = v.object({
  to: v.string(),
  subject: v.string(),
  html: v.string(),
  text: v.string(),
})
export type Message = Infer<typeof message>
export const status = v.union(
  v.literal("queued"),
  v.literal("sending"),
  v.literal("accepted"),
  v.literal("failed"),
  v.literal("uncertain")
)
// Tracks submission to Bird, not delivery to the recipient's mailbox.
export const emailSubmissions = defineTable({
  organizationId: v.optional(v.string()),
  region: v.union(v.literal("eu"), v.literal("us")),
  message: v.optional(message),
  status,
  attempts: v.number(),
  firstAttemptAt: v.optional(v.number()),
  dueAt: v.optional(v.number()),
  providerId: v.optional(v.string()),
  failure: v.optional(v.string()),
  expiresAt: v.number(),
})
  .index("by_dueAt", ["dueAt"])
  .index("by_expiresAt", ["expiresAt"])
