import { defineTable } from "convex/server"
import { v } from "convex/values"

export const providerUsage = {
  provider: v.string(),
  requestId: v.string(),
  model: v.string(),
  micros: v.number(),
  tokens: v.object({ input: v.number(), output: v.number() }),
}

/** Content-free receipts deduplicate accounting independently of file saves. */
export const usageReceipts = defineTable({
  ...providerUsage,
  runId: v.id("runs"),
  organizationId: v.string(),
})
  .index("by_provider_and_request", ["provider", "requestId"])
  .index("by_organization", ["organizationId"])
