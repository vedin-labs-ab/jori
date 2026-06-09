import { type GoogleCredentials } from "../../../providers/google/credentials"
import {
  enabledToolsEnv,
  getPromptedTools,
  type ToolPermissionInput,
} from "../policy"
import { type ToolBundle } from "../types"
import { createGoogleProxyScript } from "./script"

type GoogleRuntimeSurface = "gmail" | "googleCalendar"

export function createGmailToolBundle(
  args: {
    accountEmail: string
    credentials: GoogleCredentials
  } & ToolPermissionInput
): ToolBundle {
  return createGoogleToolBundle({
    ...args,
    name: "gmail",
    scriptPath: "/home/user/milo-workspace/milo-gmail-mcp.mjs",
    surface: "gmail",
  })
}

export function createGoogleCalendarToolBundle(
  args: {
    credentials: GoogleCredentials
  } & ToolPermissionInput
): ToolBundle {
  return createGoogleToolBundle({
    ...args,
    accountEmail: "",
    name: "googleCalendar",
    scriptPath: "/home/user/milo-workspace/milo-google-calendar-mcp.mjs",
    surface: "googleCalendar",
  })
}

function createGoogleToolBundle(
  args: {
    accountEmail: string
    credentials: GoogleCredentials
    name: string
    scriptPath: string
    surface: GoogleRuntimeSurface
  } & ToolPermissionInput
): ToolBundle {
  return {
    mcpServers: [
      {
        name: args.name,
        command: "node",
        args: [args.scriptPath],
        env: {
          MILO_GOOGLE_ACCESS_TOKEN: args.credentials.accessToken,
          MILO_GOOGLE_ACCOUNT_EMAIL: args.accountEmail,
          MILO_GOOGLE_SURFACE: args.surface,
          MILO_ENABLED_TOOLS: enabledToolsEnv(args.permissions),
        },
      },
    ],
    sandboxFiles: [
      {
        path: args.scriptPath,
        content: createGoogleProxyScript(),
      },
    ],
    preflights: [
      {
        type: args.surface,
        credentials: args.credentials,
      },
    ],
    promptedTools: getPromptedTools(args),
  }
}
