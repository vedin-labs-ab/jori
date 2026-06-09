import { type Doc } from "../../_generated/dataModel"
import { requireCredentials } from "../credentials"

export type LinearCredentials = {
  accessToken: string
  refreshToken: string
  expiresAt: number
  scope?: string
}

export function requireLinearCredentials(
  integration: Doc<"integrations">
): LinearCredentials {
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
    "Missing Linear integration credentials"
  )
}
