import { type Doc } from "../../_generated/dataModel"
import { requireTokenCredentials } from "../connect/credentials"

export type NotionCredentials = {
  tokens: {
    access: string
    refresh?: string
  }
}

export function requireNotionCredentials(
  integration: Doc<"integrations">
): NotionCredentials {
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
