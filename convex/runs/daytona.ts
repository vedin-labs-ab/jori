"use node"

import { Daytona, Image } from "@daytona/sdk"
import { createCodexConfig, parseFinalCodexMessage } from "./codex"

const codexHome = "/tmp/milo-codex-home"
const workspace = "/tmp/milo-workspace"
const outputLimit = 2_000

export type DaytonaCodexRunArgs = {
  authJsonBase64: string
  onSandboxCreated: (sandboxId: string) => Promise<void>
  prompt: string
  slackMcpToken: string
}

export type DaytonaCodexRunResult = {
  sandboxId: string
  exitCode: number
  jsonl: string
  finalMessage?: string
}

export async function runCodexInDaytona(args: DaytonaCodexRunArgs) {
  const daytona = createDaytona()
  const sandbox = await daytona.create(createSandboxParams(), { timeout: 180 })

  try {
    await args.onSandboxCreated(sandbox.id)
    await bootstrapCodex(sandbox, args.authJsonBase64)
    await verifySlackMcpReachability(sandbox, args.slackMcpToken)
    const jsonl = await executeCodex(sandbox, args)

    return {
      sandboxId: sandbox.id,
      exitCode: 0,
      jsonl,
      finalMessage: parseFinalCodexMessage(jsonl),
    }
  } finally {
    await sandbox.delete(60)
  }
}

function createDaytona() {
  const apiKey = process.env.DAYTONA_SECRET_KEY ?? process.env.DAYTONA_API_KEY

  if (apiKey === undefined) {
    throw new Error("Missing DAYTONA_SECRET_KEY or DAYTONA_API_KEY")
  }

  return new Daytona({
    apiKey,
    apiUrl: process.env.DAYTONA_API_URL,
    target: process.env.DAYTONA_TARGET,
  })
}

function createSandboxParams() {
  return {
    image: Image.base("node:22-bookworm-slim").runCommands(
      "apt-get update && apt-get install -y ca-certificates git && rm -rf /var/lib/apt/lists/*",
      "npm install -g @openai/codex@0.137.0"
    ),
    autoStopInterval: 10,
    autoArchiveInterval: 10,
    ephemeral: true,
    labels: {
      app: "milo",
      runtime: "codex",
    },
  }
}

async function bootstrapCodex(
  sandbox: Awaited<ReturnType<Daytona["create"]>>,
  authJsonBase64: string
) {
  const result = await sandbox.process.executeCommand(
    createBootstrapCommand(),
    undefined,
    {
      CODEX_AUTH_JSON_BASE64: authJsonBase64,
      CODEX_CONFIG_TOML: createCodexConfig(),
      CODEX_HOME: codexHome,
    },
    30
  )

  if (result.exitCode !== 0) {
    throw new Error("Could not bootstrap Codex inside Daytona")
  }
}

async function executeCodex(
  sandbox: Awaited<ReturnType<Daytona["create"]>>,
  args: DaytonaCodexRunArgs
) {
  const result = await sandbox.process.executeCommand(
    createCodexCommand(),
    workspace,
    {
      CODEX_HOME: codexHome,
      MILO_CODEX_PROMPT_BASE64: encodeBase64(args.prompt),
      MILO_SLACK_MCP_TOKEN: args.slackMcpToken,
    },
    180
  )

  if (result.exitCode !== 0) {
    throw new Error(
      [
        `Codex exited with code ${result.exitCode}.`,
        formatCommandOutput("stdout", result.result),
      ].join(" ")
    )
  }

  return result.result
}

async function verifySlackMcpReachability(
  sandbox: Awaited<ReturnType<Daytona["create"]>>,
  slackMcpToken: string
) {
  const result = await sandbox.process.executeCommand(
    createSlackMcpPreflightCommand(),
    undefined,
    { MILO_SLACK_MCP_TOKEN: slackMcpToken },
    30
  )

  if (result.exitCode !== 0) {
    throw new Error(
      [
        "Slack MCP is not reachable from the Daytona sandbox.",
        formatCommandOutput("stdout", result.result),
      ].join(" ")
    )
  }
}

function createBootstrapCommand() {
  return [
    "set -eu",
    `mkdir -p "${codexHome}" "${workspace}"`,
    'printf "%s" "$CODEX_AUTH_JSON_BASE64" | base64 -d > "$CODEX_HOME/auth.json"',
    'printf "%s" "$CODEX_CONFIG_TOML" > "$CODEX_HOME/config.toml"',
    'chmod 600 "$CODEX_HOME/auth.json"',
  ].join("\n")
}

function createCodexCommand() {
  return [
    "set -eu",
    'printf "%s" "$MILO_CODEX_PROMPT_BASE64" | base64 -d > /tmp/milo-prompt.md',
    "codex exec --json --ephemeral --skip-git-repo-check --sandbox read-only - < /tmp/milo-prompt.md",
  ].join("\n")
}

function createSlackMcpPreflightCommand() {
  return [
    "node <<'NODE'",
    "const response = await fetch('https://mcp.slack.com/mcp', {",
    "  headers: { authorization: 'Bearer ' + process.env.MILO_SLACK_MCP_TOKEN },",
    "});",
    "if (response.status >= 500) {",
    "  throw new Error('Slack MCP returned ' + response.status);",
    "}",
    "console.log('Slack MCP preflight status ' + response.status);",
    "NODE",
  ].join("\n")
}

function encodeBase64(value: string) {
  return Buffer.from(value, "utf8").toString("base64")
}

function formatCommandOutput(label: string, value: string | undefined) {
  if (value === undefined || value === "") {
    return `${label}: <empty>`
  }

  return `${label}: ${value.slice(0, outputLimit)}`
}
