import { type Doc } from "../../_generated/dataModel"
import { requireTokenCredentials } from "../connect/credentials"

export function requireLinearCredentials(integration: Doc<"integrations">) {
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
