import { type Doc } from "../../_generated/dataModel"

export type MicrosoftCredentials = {
  accessToken: string
  refreshToken: string
  expiresAt: number
  scope?: string
  tenantId: string
}

export function requireMicrosoftCredentials(
  integration: Doc<"integrations">
): MicrosoftCredentials {
  const credentials = integration.credentials

  if (
    typeof credentials === "object" &&
    credentials !== null &&
    "accessToken" in credentials &&
    typeof credentials.accessToken === "string" &&
    "refreshToken" in credentials &&
    typeof credentials.refreshToken === "string" &&
    "expiresAt" in credentials &&
    typeof credentials.expiresAt === "number" &&
    "tenantId" in credentials &&
    typeof credentials.tenantId === "string"
  ) {
    return {
      accessToken: credentials.accessToken,
      refreshToken: credentials.refreshToken,
      expiresAt: credentials.expiresAt,
      tenantId: credentials.tenantId,
      scope:
        "scope" in credentials && typeof credentials.scope === "string"
          ? credentials.scope
          : undefined,
    }
  }

  throw new Error("Missing Microsoft integration credentials")
}
