import { type Doc } from "../../_generated/dataModel"
import { requireCredentials } from "../credentials"

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
  return requireCredentials(
    integration,
    {
      required: {
        accessToken: "string",
        refreshToken: "string",
        expiresAt: "number",
        tenantId: "string",
      },
      optional: { scope: "string" },
    },
    "Missing Microsoft integration credentials"
  )
}
