import { type Doc } from "../../_generated/dataModel"
import { requireTokenCredentials } from "../credentials"

export type LinearCredentials = {
  tokens: {
    access: string
    refresh: string
  }
  expiresAt: number
  scope?: string
}

export function requireLinearCredentials(
  integration: Doc<"integrations">
): LinearCredentials {
  return requireTokenCredentials(
    integration,
    {
      required: {
        expiresAt: "number",
      },
      optional: { scope: "string" },
      tokens: { required: { access: "string", refresh: "string" } },
    },
    "Missing Linear integration credentials"
  )
}
