"use node"

import {
  CommandExitError,
  type CommandResult,
  Sandbox,
  type Username,
} from "e2b"
import { createCodexConfig } from "./codex"
import {
  codexHome,
  createBootstrapCommand,
  createCodexCommand,
  createInstallCommand,
  workspace,
} from "./harness"
import { createSlackTokenPreflightCommand } from "./slack"
import { type ToolBundle, type ToolPreflight } from "./tools"
import {
  assertCommandSucceeded,
  assertCommandsSucceeded,
  CodexRunError,
  createCommandTrace,
  formatError,
  type StoredCommandTrace,
  type StoredRuntimeTrace,
} from "./trace"

const sandboxTimeoutMs = 5 * 60 * 1_000

export type E2BCodexRunArgs = {
  authJsonBase64: string
  onSandboxCreated: (sandboxId: string) => Promise<void>
  prompt: string
  toolBundle: ToolBundle
}

export type E2BCodexRunResult = {
  trace: StoredRuntimeTrace
}

type E2BSandbox = Awaited<ReturnType<typeof Sandbox.create>>

export async function runCodexInE2B(args: E2BCodexRunArgs) {
  const trace: StoredRuntimeTrace = { harness: {} }
  let sandbox: E2BSandbox | undefined

  try {
    sandbox = await createE2BSandbox()
    await args.onSandboxCreated(sandbox.sandboxId)
    trace.harness.install = await installCodex(sandbox)
    assertCommandSucceeded(
      trace.harness.install,
      "Could not install Codex inside E2B.",
      trace
    )
    trace.harness.bootstrap = await bootstrapCodex(sandbox, {
      authJsonBase64: args.authJsonBase64,
      toolBundle: args.toolBundle,
    })
    assertCommandSucceeded(
      trace.harness.bootstrap,
      "Could not bootstrap Codex inside E2B.",
      trace
    )
    trace.harness.preflights = await verifyPreflights(
      sandbox,
      args.toolBundle.preflights
    )
    assertCommandsSucceeded(
      trace.harness.preflights,
      "A preflight failed inside the E2B sandbox.",
      trace
    )
    const agentTrace = await executeCodex(sandbox, args)
    trace.harness.agent = agentTrace
    assertCommandSucceeded(
      agentTrace,
      `Codex exited with code ${agentTrace.exitCode}.`,
      trace
    )
    trace.agent = { jsonl: agentTrace.stdout }

    return { trace }
  } catch (error) {
    if (error instanceof CodexRunError) {
      throw error
    }

    trace.harness.runtime = { error: formatError(error) }
    throw new CodexRunError(formatError(error), trace)
  } finally {
    await sandbox?.kill().catch(() => undefined)
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

  return createCommandTrace(result)
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

  return createCommandTrace(result)
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

  return createCommandTrace(result)
}

async function verifyPreflights(
  sandbox: E2BSandbox,
  preflights: ToolPreflight[]
) {
  const traces: StoredCommandTrace[] = []

  for (const preflight of preflights) {
    if (preflight.type === "slack") {
      traces.push(await verifySlackTokens(sandbox, preflight))
    }
  }

  return traces
}

async function verifySlackTokens(
  sandbox: E2BSandbox,
  preflight: ToolPreflight
) {
  const result = await runCommand(sandbox, createSlackTokenPreflightCommand(), {
    envs: {
      MILO_SLACK_BOT_TOKEN: preflight.botToken,
      MILO_SLACK_USER_TOKEN: preflight.userToken,
    },
    timeoutMs: 30_000,
  })

  return createCommandTrace(result)
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

function encodeBase64(value: string) {
  return Buffer.from(value, "utf8").toString("base64")
}
