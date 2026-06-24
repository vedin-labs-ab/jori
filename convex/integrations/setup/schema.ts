import { defineTable } from "convex/server"
import { type Infer, v } from "convex/values"
import { actorValidator } from "../../shared/actor"
import {
  integrationValidator,
  toolSurfaceValidator,
} from "../../shared/integrations"

export const setupLinkStatus = v.union(
  v.literal("pending"),
  v.literal("claimed"),
  v.literal("cancelled"),
  v.literal("connected"),
  v.literal("failed"),
  v.literal("expired")
)

export const setupLinkSourceActor = v.object({
  externalId: v.string(),
  email: v.optional(v.string()),
  name: v.optional(v.string()),
})

export const setupLinkSource = v.object({
  surface: toolSurfaceValidator,
  integrationId: v.optional(v.id("integrations")),
  actor: v.optional(setupLinkSourceActor),
  messageId: v.optional(v.id("messages")),
  runId: v.optional(v.id("runs")),
})

export const setupLinkDelivery = v.union(
  v.object({
    integration: v.literal("slack"),
    integrationId: v.id("integrations"),
    data: v.object({
      channelId: v.string(),
      messageTs: v.string(),
      threadTs: v.optional(v.string()),
    }),
  })
)

export type SetupLinkSource = Infer<typeof setupLinkSource>

export const setupLinks = defineTable({
  tenantId: v.string(),
  integration: integrationValidator,
  tokenHash: v.string(),
  status: setupLinkStatus,
  summary: v.optional(v.string()),
  source: setupLinkSource,
  runId: v.optional(v.id("runs")),
  awaited: v.optional(v.boolean()),
  delivery: v.optional(setupLinkDelivery),
  claim: v.optional(
    v.object({
      userId: v.string(),
      actor: v.optional(actorValidator),
      at: v.number(),
    })
  ),
  result: v.optional(
    v.object({
      actor: v.optional(actorValidator),
      integrationId: v.optional(v.id("integrations")),
      error: v.optional(v.string()),
      reason: v.optional(v.string()),
    })
  ),
  functionId: v.optional(v.id("_scheduled_functions")),
  expiresAt: v.number(),
  createdAt: v.number(),
  updatedAt: v.number(),
  consumedAt: v.optional(v.number()),
})
  .index("by_token_hash", ["tokenHash"])
  .index("by_tenant_and_status", ["tenantId", "status"])
  .index("by_run_and_status", ["runId", "status"])
  .index("by_tenant_and_integration_and_status", [
    "tenantId",
    "integration",
    "status",
  ])
