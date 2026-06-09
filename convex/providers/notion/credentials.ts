import { type Doc } from "../../_generated/dataModel"
import { requireCredentials } from "../credentials"

export type NotionCredentials = {
  accessToken: string
  refreshToken?: string
}

export function requireNotionCredentials(
  integration: Doc<"integrations">
): NotionCredentials {
  return requireCredentials(
    integration,
    {
      required: { accessToken: "string" },
      optional: { refreshToken: "string" },
    },
    "Missing Notion integration credentials"
  )
}
