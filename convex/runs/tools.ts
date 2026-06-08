import { type Doc } from "../_generated/dataModel"
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
  botToken: string
  userToken: string
}

export function assembleToolsForRun(args: {
  allowedChannelId: string
  integration: Doc<"integrations">
}): ToolBundle {
  if (args.integration.provider === "slack") {
    return createSlackToolBundle({
      allowedChannelId: args.allowedChannelId,
      botToken: args.integration.botToken,
      userToken: args.integration.userToken,
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
  allowedChannelId: string
  botToken: string
  userToken: string
}): ToolBundle {
  return {
    mcpServers: [
      {
        name: "slack",
        command: "node",
        args: ["/tmp/milo-workspace/milo-slack-mcp-proxy.mjs"],
        env: {
          MILO_SLACK_ALLOWED_CHANNEL_ID: args.allowedChannelId,
          MILO_SLACK_BOT_TOKEN: args.botToken,
          MILO_SLACK_USER_TOKEN: args.userToken,
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
        botToken: args.botToken,
        userToken: args.userToken,
      },
    ],
  }
}
