import { type GoogleCredentials } from "../../../providers/google/credentials"
import { createBrokerMcpScript } from "../adapter"
import { getProviderToolDefinitions } from "../definitions"
import {
  enabledToolsEnv,
  getPromptedTools,
  type ToolPermissionInput,
} from "../policy"
import { type BrokeredToolArgs, type ToolBundle } from "../types"

type GoogleRuntimeSurface = "gmail" | "googleCalendar"

export function createGmailToolBundle(
  args: {
    accountEmail: string
    broker: BrokeredToolArgs
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
    broker: BrokeredToolArgs
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
    broker: BrokeredToolArgs
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
          MILO_CONVEX_SITE_URL: args.broker.convexSiteUrl,
          MILO_EXECUTION_TOKEN: args.broker.executionToken,
          MILO_ENABLED_TOOLS: enabledToolsEnv(args.permissions),
        },
      },
    ],
    sandboxFiles: [
      {
        path: args.scriptPath,
        content: createBrokerMcpScript({
          provider: args.surface,
          tools: getProviderToolDefinitions(args.surface, args),
        }),
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
