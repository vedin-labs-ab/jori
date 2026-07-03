import { defineTable } from "convex/server"
import { type Infer, v } from "convex/values"
import { eventMatch } from "../events/schema"
import { integrationValidator } from "../shared/integrations"

export const accessInput = v.object({
  integrations: v.array(
    v.object({
      integration: integrationValidator,
      tools: v.array(v.string()),
    })
  ),
  web: v.boolean(),
})

export const access = v.object({
  integrations: v.array(
    v.object({
      id: v.id("integrations"),
      tools: v.array(v.string()),
    })
  ),
  web: v.boolean(),
})

export const triggerInput = v.union(
  v.object({
    at: v.string(),
  }),
  v.object({
    expression: v.string(),
  }),
  v.object({
    integration: integrationValidator,
    event: v.string(),
    match: v.optional(eventMatch),
  })
)

const trigger = v.union(
  v.object({
    at: v.number(),
    functionId: v.optional(v.id("_scheduled_functions")),
  }),
  v.object({
    expression: v.string(),
    nextAt: v.number(),
    functionId: v.optional(v.id("_scheduled_functions")),
  }),
  v.object({
    integrationId: v.id("integrations"),
    event: v.string(),
    match: v.optional(eventMatch),
  })
)

export const status = v.union(
  v.literal("active"),
  v.literal("paused"),
  v.literal("completed")
)

export const automationType = v.union(
  v.literal("once"),
  v.literal("cron"),
  v.literal("event")
)

export const automationVisibility = v.union(
  v.literal("public"),
  v.literal("private")
)

export const automations = defineTable({
  tenantId: v.string(),
  artifactId: v.optional(v.id("artifacts")),
  name: v.string(),
  instructions: v.string(),
  visibility: v.optional(automationVisibility),
  type: automationType,
  access,
  trigger,
  status,
  createdBy: v.optional(v.id("persons")),
  createdAt: v.number(),
  updatedAt: v.number(),
  firedAt: v.optional(v.number()),
})
  .index("by_tenant", ["tenantId"])
  .index("by_artifact", ["artifactId"])
  .index("by_tenant_status", ["tenantId", "status"])

export type AutomationTriggerInput = Infer<typeof triggerInput>
export type AutomationType = Infer<typeof automationType>
