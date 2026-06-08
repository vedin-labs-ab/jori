import { type Doc } from "../../_generated/dataModel"

export type SlackCredentials = {
  bot: string
  user: string
}

export function requireSlackCredentials(
  integration: Doc<"integrations">
): SlackCredentials {
  const credentials = integration.credentials

  if (
    typeof credentials === "object" &&
    credentials !== null &&
    "bot" in credentials &&
    typeof credentials.bot === "string" &&
    "user" in credentials &&
    typeof credentials.user === "string"
  ) {
    return {
      bot: credentials.bot,
      user: credentials.user,
    }
  }

  throw new Error("Missing Slack integration credentials")
}
