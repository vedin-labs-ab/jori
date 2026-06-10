import { type Doc } from "../../_generated/dataModel"
import { requireCredentials } from "../credentials"

export type GitHubCredentials = {
  installationId: string
  tokens?: {
    access?: string
  }
  expiresAt?: number
}

export function requireGitHubCredentials(
  integration: Doc<"integrations">
): GitHubCredentials {
  const credentials = requireCredentials(
    integration,
    {
      required: { installationId: "string" },
      optional: { expiresAt: "number" },
    },
    "Missing GitHub integration credentials"
  )

  return {
    ...credentials,
    tokens: readGitHubTokens(integration.credentials),
  }
}

function readGitHubTokens(credentials: unknown) {
  if (
    typeof credentials !== "object" ||
    credentials === null ||
    !("tokens" in credentials) ||
    typeof credentials.tokens !== "object" ||
    credentials.tokens === null ||
    !("access" in credentials.tokens) ||
    typeof credentials.tokens.access !== "string"
  ) {
    return undefined
  }

  return { access: credentials.tokens.access }
}
