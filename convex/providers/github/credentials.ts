import { type Doc } from "../../_generated/dataModel"
import { requireCredentials } from "../credentials"

export type GitHubCredentials = {
  installationId: string
  token?: string
  expiresAt?: number
}

export function requireGitHubCredentials(
  integration: Doc<"integrations">
): GitHubCredentials {
  return requireCredentials(
    integration,
    {
      required: { installationId: "string" },
      optional: { token: "string", expiresAt: "number" },
    },
    "Missing GitHub integration credentials"
  )
}
