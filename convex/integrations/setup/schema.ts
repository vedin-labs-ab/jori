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

export const setupLinkEventType = v.union(
  v.literal("offer.created"),
  v.literal("offer.delivered"),
  v.literal("offer.cancelled"),
  v.literal("offer.connected"),
  v.literal("offer.failed"),
  v.literal("offer.expired")
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
  delivery: v.optional(setupLinkDelivery),
  claim: v.optional(
    v.object({
      userId: v.string(),
      at: v.number(),
    })
  ),
  result: v.optional(
    v.object({
      actor: v.optional(actorValidator),
      integrationId: v.optional(v.id("integrations")),
      error: v.optional(v.string()),
    })
  ),
  functionId: v.optional(v.id("_scheduled_functions")),
  expiresAt: v.number(),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_token_hash", ["tokenHash"])
  .index("by_tenant_and_status", ["tenantId", "status"])
  .index("by_tenant_and_integration_and_status", [
    "tenantId",
    "integration",
    "status",
  ])

export const setupLinkEvents = defineTable({
  tenantId: v.string(),
  setupLinkId: v.id("setupLinks"),
  integration: integrationValidator,
  sourceSurface: toolSurfaceValidator,
  status: setupLinkStatus,
  type: setupLinkEventType,
  data: v.optional(
    v.object({
      delivery: v.optional(setupLinkDelivery),
      actor: v.optional(actorValidator),
      error: v.optional(v.string()),
      integrationId: v.optional(v.id("integrations")),
    })
  ),
  createdAt: v.number(),
})
  .index("by_setup_link_and_created_at", ["setupLinkId", "createdAt"])
  .index("by_tenant_and_created_at", ["tenantId", "createdAt"])
