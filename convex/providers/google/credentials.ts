import { type Doc } from "../../_generated/dataModel"
import { requireTokenCredentials } from "../credentials"

export type GoogleCredentials = {
  tokens: {
    access: string
    refresh: string
  }
  expiresAt: number
  scope?: string
}

export function requireGoogleCredentials(
  integration: Doc<"integrations">
): GoogleCredentials {
  return requireTokenCredentials(
    integration,
    {
      required: {
        expiresAt: "number",
      },
      optional: { scope: "string" },
      tokens: { required: { access: "string", refresh: "string" } },
    },
    "Missing Google Workspace integration credentials"
  )
}
