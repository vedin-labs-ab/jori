import { defineTable } from "convex/server"
import { v } from "convex/values"

export const watches = defineTable({
  tenantId: v.string(),
  integrationId: v.id("integrations"),
  externalId: v.string(),
}).index("by_tenant_and_integration_and_external", [
  "tenantId",
  "integrationId",
  "externalId",
])
