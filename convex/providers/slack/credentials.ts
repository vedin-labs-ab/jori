import { type Doc } from "../../_generated/dataModel"

export type SlackCredentials = {
  botToken: string
  userToken: string
}

export function requireSlackCredentials(
  integration: Doc<"integrations">
): SlackCredentials {
  const credentials = integration.credentials

  if (
    typeof credentials === "object" &&
    credentials !== null &&
    "botToken" in credentials &&
    typeof credentials.botToken === "string" &&
    "userToken" in credentials &&
    typeof credentials.userToken === "string"
  ) {
    return {
      botToken: credentials.botToken,
      userToken: credentials.userToken,
    }
  }

  throw new Error("Missing Slack integration credentials")
}
