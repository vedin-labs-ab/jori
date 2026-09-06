import { defineTable } from "convex/server"
import { v } from "convex/values"
import { audienceValidator } from "../shared/audience"
import { debounceValidator } from "../shared/debounce"
import { messageSurfaceValidator } from "../shared/integrations"

// A conversation is keyed by the surface it happens on. Provider
// conversations carry their integration row and the provider's thread id as
// `externalId`; console conversations carry no integration and use their own
// id as `externalId`, so every reader resolves messages the same way.
export const conversations = defineTable({
  organizationId: v.string(),
  surface: messageSurfaceValidator,
  integrationId: v.optional(v.id("integrations")),
  externalId: v.string(),
  scope: audienceValidator,
  // Console conversations: the first message's first line, who opened it,
  // and when it last moved, so a person's list orders by activity.
  title: v.optional(v.string()),
  createdBy: v.optional(v.id("persons")),
  updatedAt: v.optional(v.number()),
  summary: v.optional(v.string()),
  summarizedAt: v.optional(v.number()),
  debounce: debounceValidator,
})
  .index("by_organization_and_integration_and_external", [
    "organizationId",
    "integrationId",
    "externalId",
  ])
  .index("by_organization_and_created_by_and_updated_at", [
    "organizationId",
    "createdBy",
    "updatedAt",
  ])
  .index("by_organization_and_summarized_at", [
    "organizationId",
    "summarizedAt",
  ])
