import { defineTable } from "convex/server"
import { v } from "convex/values"
import { actorValidator } from "../shared/actor"
import { integrationValidator } from "../shared/integrations"

export const messages = defineTable({
  tenantId: v.string(),
  integrationId: v.id("integrations"),
  integration: integrationValidator,
  type: v.string(),
  externalId: v.string(),
  mentioned: v.boolean(),
  actor: v.optional(actorValidator),
  personId: v.optional(v.id("persons")),
  conversationId: v.string(),
  // Write-time stamp of the durable place (channel, repository, team) the
  // message landed in, so place profiling reads one index range and never
  // dereferences provider data. DMs stay unstamped.
  placeId: v.optional(v.id("places")),
  targetKey: v.optional(v.string()),
  // Human-readable text: provider edges resolve mention/link tokens and
  // emoji shortcodes before intake, so consumers never parse surface syntax.
  text: v.optional(v.string()),
  data: v.optional(v.any()),
  observedAt: v.optional(v.number()),
  createdAt: v.number(),
})
  .index("by_external_id", ["externalId"])
  .index("by_conversation", ["tenantId", "integrationId", "conversationId"])
  .index("by_tenant_and_integration_and_conversation_and_created_at", [
    "tenantId",
    "integrationId",
    "conversationId",
    "createdAt",
  ])
  .index("by_tenant_and_person_and_created_at", [
    "tenantId",
    "personId",
    "createdAt",
  ])
  .index("by_integration_and_target", ["integrationId", "targetKey"])
  .index("by_place_and_created_at", ["placeId", "createdAt"])
