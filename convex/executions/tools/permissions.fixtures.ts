import { type Doc } from "../../_generated/dataModel"

export function runtimeMilo() {
  return {
    convexSiteUrl: "https://convex.example",
    executionToken: "execution-token",
  }
}

export function integration(provider: string): Doc<"integrations"> {
  return {
    _id: `${provider}-integration`,
    _creationTime: 0,
    tenantId: "tenant",
    provider,
    scope: isUserScopedProvider(provider) ? "user" : "tenant",
    ownerId: isUserScopedProvider(provider) ? "user" : undefined,
    externalId: `${provider}-account`,
    email: isUserScopedProvider(provider) ? "user@example.com" : undefined,
    credentials: credentials(provider),
    status: "active",
    createdBy: "user",
    createdAt: 0,
    updatedAt: 0,
  } as Doc<"integrations">
}

function isUserScopedProvider(provider: string) {
  return (
    provider === "gmail" ||
    provider === "googleCalendar" ||
    provider === "microsoftEmail" ||
    provider === "microsoftCalendar"
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

function credentials(provider: string) {
  if (provider === "github") {
    return {
      installationId: "123",
      tokens: { access: "github-token" },
      expiresAt: Date.now() + 60_000,
    }
  }

  if (provider === "slack") {
    return { bot: "bot-token", user: "user-token" }
  }

  if (provider === "microsoftEmail" || provider === "microsoftCalendar") {
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
