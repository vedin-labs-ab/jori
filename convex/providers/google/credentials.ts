import { type Doc } from "../../_generated/dataModel"
import { requireCredentials } from "../credentials"

export type GoogleCredentials = {
  accessToken: string
  refreshToken: string
  expiresAt: number
  scope?: string
}

export function requireGoogleCredentials(
  integration: Doc<"integrations">
): GoogleCredentials {
  return requireCredentials(
    integration,
    {
      required: {
        accessToken: "string",
        refreshToken: "string",
        expiresAt: "number",
      },
      optional: { scope: "string" },
    },
    "Missing Google Workspace integration credentials"
  )
}
