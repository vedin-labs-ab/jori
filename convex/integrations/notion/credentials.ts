import { type Doc } from "../../_generated/dataModel"
import { requireTokenCredentials } from "../connect/credentials"

export function requireNotionCredentials(integration: Doc<"integrations">) {
  return requireTokenCredentials(
    integration,
    {
      tokens: {
        required: { access: "string" },
        optional: { refresh: "string" },
      },
    },
    "Missing Notion integration credentials"
  )
}
