"use node"

import {
  CommandExitError,
  type CommandResult,
  Sandbox,
  type Username,
} from "e2b"
import { createCodexConfig, parseFinalCodexMessage } from "./codex"
import { createSlackTokenPreflightCommand } from "./slack"
import { type ToolBundle, type ToolPreflight } from "./tools"

const codexHome = "/tmp/milo-codex-home"
const workspace = "/tmp/milo-workspace"
const commandOutputLimit = 2_000
const sandboxTimeoutMs = 5 * 60 * 1_000

export type E2BCodexRunArgs = {
  authJsonBase64: string
  onSandboxCreated: (sandboxId: string) => Promise<void>
  prompt: string
  toolBundle: ToolBundle
}

export type E2BCodexRunResult = {
  sandboxId: string
  exitCode: number
  jsonl: string
  finalMessage?: string
}

type E2BSandbox = Awaited<ReturnType<typeof Sandbox.create>>

export async function runCodexInE2B(args: E2BCodexRunArgs) {
  const sandbox = await createE2BSandbox()

  try {
    await args.onSandboxCreated(sandbox.sandboxId)
    await installCodex(sandbox)
    await bootstrapCodex(sandbox, {
      authJsonBase64: args.authJsonBase64,
      toolBundle: args.toolBundle,
    })
    await verifyPreflights(sandbox, args.toolBundle.preflights)
    const jsonl = await executeCodex(sandbox, args)

    return {
      sandboxId: sandbox.sandboxId,
      exitCode: 0,
      jsonl,
      finalMessage: parseFinalCodexMessage(jsonl),
    }
  } finally {
    await sandbox.kill()
  }
}

async function createE2BSandbox() {
  return await Sandbox.create({
    apiKey: requireE2BApiKey(),
    allowInternetAccess: true,
    metadata: {
      app: "milo",
      runtime: "codex",
    },
    timeoutMs: sandboxTimeoutMs,
  })
}

function requireE2BApiKey() {
  const apiKey = process.env.E2B_API_KEY

  if (apiKey === undefined) {
    throw new Error("Missing E2B_API_KEY")
  }

  return apiKey
}

async function installCodex(sandbox: E2BSandbox) {
  const result = await runCommand(sandbox, createInstallCommand(), {
    timeoutMs: 120_000,
    user: "root",
  })

  if (result.exitCode !== 0) {
    throw new Error(
      [
        "Could not install Codex inside E2B.",
        formatCommandOutput("stdout", result.stdout),
        formatCommandOutput("stderr", result.stderr),
      ].join(" ")
    )
  }
}

async function bootstrapCodex(
  sandbox: E2BSandbox,
  args: {
    authJsonBase64: string
    toolBundle: ToolBundle
  }
) {
  const result = await runCommand(sandbox, createBootstrapCommand(), {
    envs: {
      CODEX_AUTH_JSON_BASE64: args.authJsonBase64,
      CODEX_CONFIG_TOML: createCodexConfig({
        mcpServers: args.toolBundle.mcpServers,
      }),
      CODEX_HOME: codexHome,
      MILO_SANDBOX_FILES_BASE64: encodeBase64(
        JSON.stringify(args.toolBundle.sandboxFiles)
      ),
    },
    timeoutMs: 30_000,
  })

  if (result.exitCode !== 0) {
    throw new Error(
      [
        "Could not bootstrap Codex inside E2B.",
        formatCommandOutput("stdout", result.stdout),
        formatCommandOutput("stderr", result.stderr),
      ].join(" ")
    )
  }
}

async function executeCodex(sandbox: E2BSandbox, args: E2BCodexRunArgs) {
  const result = await runCommand(sandbox, createCodexCommand(), {
    cwd: workspace,
    envs: {
      CODEX_HOME: codexHome,
      MILO_CODEX_PROMPT_BASE64: encodeBase64(args.prompt),
    },
    timeoutMs: 180_000,
  })

  if (result.exitCode !== 0) {
    throw new Error(
      [
        `Codex exited with code ${result.exitCode}.`,
        formatCommandOutput("stdout", result.stdout),
        formatCommandOutput("stderr", result.stderr),
      ].join(" ")
    )
  }

  return result.stdout
}

async function verifyPreflights(
  sandbox: E2BSandbox,
  preflights: ToolPreflight[]
) {
  for (const preflight of preflights) {
    if (preflight.type === "slack") {
      await verifySlackTokens(sandbox, preflight)
    }
  }
}

async function verifySlackTokens(
  sandbox: E2BSandbox,
  preflight: ToolPreflight
) {
  const result = await runCommand(sandbox, createSlackTokenPreflightCommand(), {
    envs: {
      MILO_SLACK_BOT_TOKEN: preflight.credentials.botToken,
      MILO_SLACK_USER_TOKEN: preflight.credentials.userToken,
    },
    timeoutMs: 30_000,
  })

  if (result.exitCode !== 0) {
    throw new Error(
      [
        "Slack tokens failed preflight inside the E2B sandbox.",
        formatCommandOutput("stdout", result.stdout),
        formatCommandOutput("stderr", result.stderr),
      ].join(" ")
    )
  }
}

async function runCommand(
  sandbox: E2BSandbox,
  command: string,
  options: {
    cwd?: string
    envs?: Record<string, string>
    timeoutMs: number
    user?: Username
  }
) {
  try {
    return await sandbox.commands.run(command, options)
  } catch (error) {
    if (error instanceof CommandExitError) {
      return {
        exitCode: error.exitCode,
        error: error.error,
        stdout: error.stdout,
        stderr: error.stderr,
      } satisfies CommandResult
    }

    throw error
  }
}

function createInstallCommand() {
  return [
    "set -eu",
    "if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then",
    "  apt-get update",
    "  apt-get install -y ca-certificates curl gnupg",
    "  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -",
    "  apt-get install -y nodejs",
    "fi",
    "if ! command -v git >/dev/null 2>&1; then",
    "  apt-get update",
    "  apt-get install -y git",
    "fi",
    `mkdir -p "${workspace}"`,
    "npm install -g @openai/codex@0.137.0 slack-mcp-server@1.3.0",
    `npm install --prefix "${workspace}" @modelcontextprotocol/sdk@1.29.0`,
    `chmod 777 "${workspace}"`,
    "rm -rf /var/lib/apt/lists/*",
  ].join("\n")
}

function createBootstrapCommand() {
  return [
    "set -eu",
    `mkdir -p "${codexHome}" "${workspace}"`,
    'printf "%s" "$CODEX_AUTH_JSON_BASE64" | base64 -d > "$CODEX_HOME/auth.json"',
    'printf "%s" "$CODEX_CONFIG_TOML" > "$CODEX_HOME/config.toml"',
    'printf "%s" "$MILO_SANDBOX_FILES_BASE64" | base64 -d > /tmp/milo-sandbox-files.json',
    "node <<'NODE'",
    "const fs = require('fs');",
    "const path = require('path');",
    "const files = JSON.parse(fs.readFileSync('/tmp/milo-sandbox-files.json', 'utf8'));",
    "for (const file of files) {",
    "  fs.mkdirSync(path.dirname(file.path), { recursive: true });",
    "  fs.writeFileSync(file.path, file.content);",
    "}",
    "NODE",
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

function encodeBase64(value: string) {
  return Buffer.from(value, "utf8").toString("base64")
}

function formatCommandOutput(label: string, value: string | undefined) {
  if (value === undefined || value === "") {
    return `${label}: <empty>`
  }

  return `${label}: ${value.slice(0, commandOutputLimit)}`
}
