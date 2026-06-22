import { defineTable } from "convex/server"
import { type Infer, v } from "convex/values"
import {
  integrationValidator,
  toolSurfaceValidator,
} from "../../shared/integrations"

export const setupLinkStatus = v.union(
  v.literal("pending"),
  v.literal("claimed"),
  v.literal("connected"),
  v.literal("failed")
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

export type SetupLinkSource = Infer<typeof setupLinkSource>

export const setupLinks = defineTable({
  tenantId: v.string(),
  integration: integrationValidator,
  tokenHash: v.string(),
  status: setupLinkStatus,
  source: setupLinkSource,
  claim: v.optional(
    v.object({
      userId: v.string(),
      at: v.number(),
    })
  ),
  result: v.optional(
    v.object({
      integrationId: v.optional(v.id("integrations")),
      error: v.optional(v.string()),
    })
  ),
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
