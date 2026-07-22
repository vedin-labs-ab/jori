import { type Doc } from "../../_generated/dataModel"
import { requireTokenCredentials } from "../connect/credentials"

export function requireMicrosoftCredentials(integration: Doc<"integrations">) {
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
