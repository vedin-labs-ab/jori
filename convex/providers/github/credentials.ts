import { type Doc } from "../../_generated/dataModel"

export type GitHubCredentials = {
  installationId: string
  token?: string
  expiresAt?: number
}

export function requireGitHubCredentials(
  integration: Doc<"integrations">
): GitHubCredentials {
  const credentials = integration.credentials

  if (
    typeof credentials === "object" &&
    credentials !== null &&
    "installationId" in credentials &&
    typeof credentials.installationId === "string"
  ) {
    return {
      installationId: credentials.installationId,
      token:
        "token" in credentials && typeof credentials.token === "string"
          ? credentials.token
          : undefined,
      expiresAt:
        "expiresAt" in credentials && typeof credentials.expiresAt === "number"
          ? credentials.expiresAt
          : undefined,
    }
  }

  throw new Error("Missing GitHub integration credentials")
}
