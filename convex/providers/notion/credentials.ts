import { type Doc } from "../../_generated/dataModel"

export type NotionCredentials = {
  accessToken: string
  refreshToken?: string
}

export function requireNotionCredentials(
  integration: Doc<"integrations">
): NotionCredentials {
  const credentials = integration.credentials

  if (
    typeof credentials === "object" &&
    credentials !== null &&
    "accessToken" in credentials &&
    typeof credentials.accessToken === "string"
  ) {
    return {
      accessToken: credentials.accessToken,
      refreshToken:
        "refreshToken" in credentials &&
        typeof credentials.refreshToken === "string"
          ? credentials.refreshToken
          : undefined,
    }
  }

  throw new Error("Missing Notion integration credentials")
}
