import { createGitHubTokenPreflightCommand } from "../tools/github"
import { createGoogleTokenPreflightCommand } from "../tools/google"
import { createLinearTokenPreflightCommand } from "../tools/linear"
import { createMicrosoftTokenPreflightCommand } from "../tools/microsoft"
import { createNotionTokenPreflightCommand } from "../tools/notion"
import { createSlackTokenPreflightCommand } from "../tools/slack"
import { type ToolPreflight } from "../tools/types"

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

  if (preflight.type === "notion") {
    return createNotionTokenPreflightCommand()
  }

  return createMicrosoftTokenPreflightCommand(preflight.type)
}

export function createToolPreflightEnv(
  preflight: ToolPreflight
): Record<string, string> {
  if (preflight.type === "github") {
    return {
      MILO_GITHUB_TOKEN: preflight.credentials.token ?? "",
      MILO_GITHUB_OWNER: preflight.owner ?? "",
      MILO_GITHUB_REPO: preflight.repo ?? "",
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

  if (preflight.type === "notion") {
    return {
      MILO_NOTION_ACCESS_TOKEN: preflight.credentials.accessToken,
    }
  }

  return {
    MILO_MICROSOFT_ACCESS_TOKEN: preflight.credentials.accessToken,
  }
}
