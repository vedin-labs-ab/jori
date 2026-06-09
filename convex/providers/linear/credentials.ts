import { type Doc } from "../../_generated/dataModel"

export type LinearCredentials = {
  accessToken: string
  refreshToken: string
  expiresAt: number
  scope?: string
}

export function requireLinearCredentials(
  integration: Doc<"integrations">
): LinearCredentials {
  const credentials = integration.credentials

  if (
    typeof credentials === "object" &&
    credentials !== null &&
    "accessToken" in credentials &&
    typeof credentials.accessToken === "string" &&
    "refreshToken" in credentials &&
    typeof credentials.refreshToken === "string" &&
    "expiresAt" in credentials &&
    typeof credentials.expiresAt === "number"
  ) {
    return {
      accessToken: credentials.accessToken,
      refreshToken: credentials.refreshToken,
      expiresAt: credentials.expiresAt,
      scope:
        "scope" in credentials && typeof credentials.scope === "string"
          ? credentials.scope
          : undefined,
    }
  }

  throw new Error("Missing Linear integration credentials")
}
