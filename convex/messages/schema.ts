import { defineTable } from "convex/server"
import { v } from "convex/values"
import { actorValidator } from "../shared/actor"
import { messageSurfaceValidator } from "../shared/integrations"

export const messages = defineTable({
  organizationId: v.string(),
  surface: messageSurfaceValidator,
  // Present exactly when the surface is a provider; console messages have
  // no integration row and index under an undefined integration.
  integrationId: v.optional(v.id("integrations")),
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
  .index("by_conversation", [
    "organizationId",
    "integrationId",
    "conversationId",
  ])
  .index("by_organization_and_integration_and_conversation_and_created_at", [
    "organizationId",
    "integrationId",
    "conversationId",
    "createdAt",
  ])
  .index("by_organization_and_person_and_created_at", [
    "organizationId",
    "personId",
    "createdAt",
  ])
  .index("by_integration_and_target", ["integrationId", "targetKey"])
  .index("by_place_and_created_at", ["placeId", "createdAt"])
