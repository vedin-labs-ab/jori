import { type Doc, type Id } from "../../../_generated/dataModel"

export function promptIntegration(integration: string): Doc<"integrations"> {
  return {
    _id: `${integration}-integration`,
    _creationTime: 0,
    tenantId: "tenant",
    integration,
    scope: "tenant",
    externalId: `${integration}-account`,
    credentials: {},
    data: integration === "slack" ? { botUserId: "UBOT" } : {},
    status: "active",
    createdBy: "person" as Id<"persons">,
    createdAt: 0,
    updatedAt: 0,
  } as Doc<"integrations">
}
