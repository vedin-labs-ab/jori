import { type Doc } from "../../_generated/dataModel"
import { requireCredentials } from "../connect/credentials"

export function requireGitHubCredentials(integration: Doc<"integrations">) {
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

export function requireGitHubRuntimeToken(integration: Doc<"integrations">) {
  const credentials = requireGitHubCredentials(integration)

  if (credentials.tokens?.access === undefined) {
    throw new Error("Missing GitHub runtime token")
  }

  return credentials.tokens.access
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
