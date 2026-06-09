import { type Doc } from "../../_generated/dataModel"

export type MicrosoftCredentials = {
  accessToken: string
  refreshToken: string
  expiresAt: number
  scope?: string
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

  throw new Error("Missing Microsoft integration credentials")
}
