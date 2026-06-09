import { type MicrosoftCredentials } from "../../../providers/microsoft/credentials"
import { createBrokerMcpScript } from "../adapter"
import { getProviderToolDefinitions } from "../definitions"
import {
  enabledToolsEnv,
  getPromptedTools,
  type ToolPermissionInput,
} from "../policy"
import { type BrokeredToolArgs, type ToolBundle } from "../types"

type MicrosoftRuntimeSurface = "microsoftCalendar" | "microsoftEmail"

export function createMicrosoftEmailToolBundle(
  args: {
    broker: BrokeredToolArgs
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
    broker: BrokeredToolArgs
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
    broker: BrokeredToolArgs
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
          tools: getProviderToolDefinitions(args.surface),
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
