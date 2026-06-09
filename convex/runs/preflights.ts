import { createGitHubTokenPreflightCommand } from "./github"
import { createGoogleTokenPreflightCommand } from "./google"
import { createLinearTokenPreflightCommand } from "./linear"
import { createMicrosoftTokenPreflightCommand } from "./microsoft"
import { createSlackTokenPreflightCommand } from "./slack"
import { type ToolPreflight } from "./tools"

export function createToolPreflightCommand(preflight: ToolPreflight) {
  if (preflight.type === "github") {
    return createGitHubTokenPreflightCommand()
  }

  if (preflight.type === "linear") {
    return createLinearTokenPreflightCommand()
  }

  if (preflight.type === "slack") {
    return createSlackTokenPreflightCommand()
  }

  if (preflight.type === "gmail") {
    return createGoogleTokenPreflightCommand("gmail")
  }

  if (preflight.type === "googleCalendar") {
    return createGoogleTokenPreflightCommand("googleCalendar")
  }

  return createMicrosoftTokenPreflightCommand(preflight.type)
}

export function createToolPreflightEnv(
  preflight: ToolPreflight
): Record<string, string> {
  if (preflight.type === "github") {
    return {
      MILO_GITHUB_TOKEN: preflight.credentials.token ?? "",
      MILO_GITHUB_OWNER: preflight.owner,
      MILO_GITHUB_REPO: preflight.repo,
    }
  }

  if (preflight.type === "linear") {
    return {
      MILO_LINEAR_ACCESS_TOKEN: preflight.credentials.accessToken,
    }
  }

  if (preflight.type === "slack") {
    return {
      MILO_SLACK_BOT_TOKEN: preflight.credentials.bot,
      MILO_SLACK_USER_TOKEN: preflight.credentials.user,
    }
  }

  if (preflight.type === "gmail" || preflight.type === "googleCalendar") {
    return {
      MILO_GOOGLE_ACCESS_TOKEN: preflight.credentials.accessToken,
    }
  }

  return {
    MILO_MICROSOFT_ACCESS_TOKEN: preflight.credentials.accessToken,
  }
}
