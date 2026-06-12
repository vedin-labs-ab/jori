import { type ToolPreflight } from "../../tools/types"
import { createTokenPreflightCommand } from "./script"
import { slackTokenPreflightCommand } from "./slack"
import { tokenPreflightSpecs } from "./specs"

export function createToolPreflightCommand(preflight: ToolPreflight) {
  return preflight.type === "slack"
    ? slackTokenPreflightCommand
    : createTokenPreflightCommand(tokenPreflightSpecs[preflight.type])
}

export function createToolPreflightEnv(
  preflight: ToolPreflight
): Record<string, string> {
  if (preflight.type === "slack") {
    return {
      MILO_SLACK_BOT_TOKEN: preflight.credentials.bot,
      MILO_SLACK_USER_TOKEN: preflight.credentials.user,
    }
  }

  return {
    [tokenPreflightSpecs[preflight.type].tokenEnv]: getAccessToken(preflight),
  }
}

function getAccessToken(preflight: Exclude<ToolPreflight, { type: "slack" }>) {
  return preflight.type === "github"
    ? (preflight.credentials.tokens?.access ?? "")
    : preflight.credentials.tokens.access
}
