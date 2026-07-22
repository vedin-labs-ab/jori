import { type Doc } from "../../_generated/dataModel"
import { requireCredentials } from "../connect/credentials"

export function requireSlackCredentials(integration: Doc<"integrations">) {
  return requireCredentials(
    integration,
    { required: { bot: "string", user: "string" } },
    "Missing Slack integration credentials"
  )
}
