import { defineTable } from "convex/server"
import { type Infer, v } from "convex/values"
import { actorValidator } from "../../shared/actor"
import {
  integrationValidator,
  slackMessageDeliveryValidator,
  toolSurfaceValidator,
} from "../../shared/integrations"

const integrationOfferStatus = v.union(
  v.literal("pending"),
  v.literal("claimed"),
  v.literal("cancelled"),
  v.literal("connected"),
  v.literal("failed"),
  v.literal("expired")
)

const integrationOfferSourceActor = v.object({
  externalId: v.string(),
  email: v.optional(v.string()),
  name: v.optional(v.string()),
})

export const integrationOfferSource = v.object({
  surface: toolSurfaceValidator,
  integrationId: v.optional(v.id("integrations")),
  actor: v.optional(integrationOfferSourceActor),
  messageId: v.optional(v.id("messages")),
  runId: v.optional(v.id("runs")),
})

export type IntegrationOfferSource = Infer<typeof integrationOfferSource>

export const integrationOffers = defineTable({
  organizationId: v.string(),
  integration: integrationValidator,
  tokenHash: v.string(),
  status: integrationOfferStatus,
  summary: v.optional(v.string()),
  source: integrationOfferSource,
  runId: v.optional(v.id("runs")),
  delivery: v.optional(slackMessageDeliveryValidator),
  claim: v.optional(
    v.object({
      personId: v.id("persons"),
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
  .index("by_run_and_status", ["runId", "status"])
