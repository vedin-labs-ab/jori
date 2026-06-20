import { type Doc } from "../../../_generated/dataModel"

export function runtimeMilo() {
  return {
    convexSiteUrl: "https://convex.example",
    executionToken: "execution-token",
  }
}

export function integration(integration: string): Doc<"integrations"> {
  return {
    _id: `${integration}-integration`,
    _creationTime: 0,
    tenantId: "tenant",
    integration,
    scope: isUserScopedIntegration(integration) ? "user" : "tenant",
    ownerId: isUserScopedIntegration(integration) ? "user" : undefined,
    externalId: `${integration}-account`,
    email: isUserScopedIntegration(integration)
      ? "user@example.com"
      : undefined,
    credentials: credentials(integration),
    status: "active",
    createdBy: "user",
    createdAt: 0,
    updatedAt: 0,
  } as Doc<"integrations">
}

function isUserScopedIntegration(integration: string) {
  return (
    integration === "gmail" ||
    integration === "googleCalendar" ||
    integration === "microsoftEmail" ||
    integration === "microsoftCalendar"
  )
}

export function readProperties(schema: unknown) {
  if (
    typeof schema !== "object" ||
    schema === null ||
    !("properties" in schema)
  ) {
    return {}
  }

  const properties = schema.properties

  return typeof properties === "object" && properties !== null ? properties : {}
}

export function readRequired(schema: unknown) {
  if (
    typeof schema !== "object" ||
    schema === null ||
    !("required" in schema)
  ) {
    return []
  }

  return Array.isArray(schema.required) ? schema.required : []
}

function credentials(integration: string) {
  if (integration === "github") {
    return {
      installationId: "123",
      tokens: { access: "github-token" },
      expiresAt: Date.now() + 60_000,
    }
  }

  if (integration === "slack") {
    return { bot: "bot-token", user: "user-token" }
  }

  if (integration === "microsoftEmail" || integration === "microsoftCalendar") {
    return {
      tokens: { access: "access-token", refresh: "refresh-token" },
      expiresAt: Date.now() + 60_000,
      tenantId: "microsoft-tenant",
    }
  }

  return {
    tokens: { access: "access-token", refresh: "refresh-token" },
    expiresAt: Date.now() + 60_000,
  }
}
