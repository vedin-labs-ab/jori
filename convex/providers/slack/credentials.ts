import { type Doc } from "../../_generated/dataModel"
import { requireCredentials } from "../credentials"

export type SlackCredentials = {
  bot: string
  user: string
}

export function requireSlackCredentials(
  integration: Doc<"integrations">
): SlackCredentials {
  return requireCredentials(
    integration,
    { required: { bot: "string", user: "string" } },
    "Missing Slack integration credentials"
  )
}
