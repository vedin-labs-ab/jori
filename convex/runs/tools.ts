import { type Doc } from "../_generated/dataModel"
import {
  requireSlackCredentials,
  type SlackCredentials,
} from "../providers/slack/credentials"
import { createSlackProxyScript } from "./proxy"

export type ToolBundle = {
  mcpServers: McpServerConfig[]
  sandboxFiles: SandboxFile[]
  preflights: ToolPreflight[]
}

export type McpServerConfig = {
  name: string
  command: string
  args: string[]
  env: Record<string, string>
}

export type SandboxFile = {
  path: string
  content: string
}

export type ToolPreflight = {
  type: "slack"
  credentials: SlackCredentials
}

export type RuntimeTarget = {
  provider: "slack"
  locationId: string
}

export function assembleToolsForRun(args: {
  integration: Doc<"integrations">
  target: RuntimeTarget
}): ToolBundle {
  if (args.target.provider === "slack") {
    const credentials = requireSlackCredentials(args.integration)

    return createSlackToolBundle({
      credentials,
      locationId: args.target.locationId,
    })
  }

  return {
    mcpServers: [],
    sandboxFiles: [],
    preflights: [],
  }
}

export function summarizeToolBundle(bundle: ToolBundle) {
  return {
    mcpServers: bundle.mcpServers.map((server) => ({
      name: server.name,
      command: server.command,
      args: server.args,
      env: Object.keys(server.env).sort(),
    })),
    sandboxFiles: bundle.sandboxFiles.map((file) => file.path),
    preflights: bundle.preflights.map((preflight) => preflight.type),
  }
}

function createSlackToolBundle(args: {
  credentials: SlackCredentials
  locationId: string
}): ToolBundle {
  return {
    mcpServers: [
      {
        name: "slack",
        command: "node",
        args: ["/tmp/milo-workspace/milo-slack-mcp-proxy.mjs"],
        env: {
          MILO_SLACK_ALLOWED_CHANNEL_ID: args.locationId,
          MILO_SLACK_BOT_TOKEN: args.credentials.botToken,
          MILO_SLACK_USER_TOKEN: args.credentials.userToken,
        },
      },
    ],
    sandboxFiles: [
      {
        path: "/tmp/milo-workspace/milo-slack-mcp-proxy.mjs",
        content: createSlackProxyScript(),
      },
    ],
    preflights: [
      {
        type: "slack",
        credentials: args.credentials,
      },
    ],
  }
}
