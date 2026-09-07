import { defineTable } from "convex/server"
import { v } from "convex/values"

// One administrator-armed slot per deployment, never a live signing secret.
export const notionWebhookSetups = defineTable({
  expiresAt: v.number(),
  token: v.optional(v.string()),
})
