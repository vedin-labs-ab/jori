import { type Doc } from "../../_generated/dataModel"
import { requireTokenCredentials } from "../credentials"

export type MicrosoftCredentials = {
  tokens: {
    access: string
    refresh: string
  }
  expiresAt: number
  scope?: string
  tenantId: string
}

export function requireMicrosoftCredentials(
  integration: Doc<"integrations">
): MicrosoftCredentials {
  return requireTokenCredentials(
    integration,
    {
      required: {
        expiresAt: "number",
        tenantId: "string",
      },
      optional: { scope: "string" },
      tokens: { required: { access: "string", refresh: "string" } },
    },
    "Missing Microsoft integration credentials"
  )
}
