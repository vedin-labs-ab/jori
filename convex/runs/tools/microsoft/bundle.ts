import { type MicrosoftCredentials } from "../../../providers/microsoft/credentials"
import {
  enabledToolsEnv,
  getPromptedTools,
  type ToolPermissionInput,
} from "../policy"
import { type ToolBundle } from "../types"
import { createMicrosoftGraphMcpScript } from "./script"

type MicrosoftRuntimeSurface = "microsoftCalendar" | "microsoftEmail"

export function createMicrosoftEmailToolBundle(
  args: {
    credentials: MicrosoftCredentials
  } & ToolPermissionInput
): ToolBundle {
  return createMicrosoftToolBundle({
    ...args,
    name: "microsoftEmail",
    scriptPath: "/home/user/milo-workspace/milo-microsoft-email-mcp.mjs",
    surface: "microsoftEmail",
  })
}

export function createMicrosoftCalendarToolBundle(
  args: {
    credentials: MicrosoftCredentials
  } & ToolPermissionInput
): ToolBundle {
  return createMicrosoftToolBundle({
    ...args,
    name: "microsoftCalendar",
    scriptPath: "/home/user/milo-workspace/milo-microsoft-calendar-mcp.mjs",
    surface: "microsoftCalendar",
  })
}

function createMicrosoftToolBundle(
  args: {
    credentials: MicrosoftCredentials
    name: string
    scriptPath: string
    surface: MicrosoftRuntimeSurface
  } & ToolPermissionInput
): ToolBundle {
  return {
    mcpServers: [
      {
        name: args.name,
        command: "node",
        args: [args.scriptPath],
        env: {
          MILO_MICROSOFT_ACCESS_TOKEN: args.credentials.accessToken,
          MILO_MICROSOFT_SURFACE: args.surface,
          MILO_ENABLED_TOOLS: enabledToolsEnv(args.permissions),
        },
      },
    ],
    sandboxFiles: [
      {
        path: args.scriptPath,
        content: createMicrosoftGraphMcpScript(),
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
