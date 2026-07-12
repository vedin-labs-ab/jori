import { CommandExitError, type CommandResult, Sandbox } from "e2b"
import { type MiloConvexClient } from "../../convex"
import { type ConvexId } from "../../types"
import { type SandboxCommandInput, type SandboxCommandResult } from "../types"

export type E2BSandbox = Awaited<ReturnType<typeof Sandbox.create>>

const defaultCommandTimeoutMs = 20 * 60 * 1000
const defaultSandboxTimeoutMs = 60 * 60 * 1000

export async function killE2BSandbox(args: {
  convex: MiloConvexClient
  sandboxId: string
}) {
  await Sandbox.kill(args.sandboxId, { apiKey: requireE2BApiKey() }).catch(
    () => false
  )
  await args.convex.markSandboxCleaned({
    externalId: args.sandboxId,
  })
}

export async function connectSandbox(sandboxId: string) {
  return await Sandbox.connect(sandboxId, {
    apiKey: requireE2BApiKey(),
    timeoutMs: defaultSandboxTimeoutMs,
  })
}

export async function createSandbox(runId: ConvexId<"runs">) {
  return await Sandbox.create(requireSandboxTemplate(), {
    apiKey: requireE2BApiKey(),
    allowInternetAccess: true,
    lifecycle: {
      autoResume: true,
      onTimeout: "pause",
    },
    metadata: {
      app: "milo",
      runId,
      runtime: "trigger",
    },
    timeoutMs: defaultSandboxTimeoutMs,
  })
}

export function normalizeCommandResult(
  result: CommandResult
): SandboxCommandResult {
  return {
    exitCode: result.exitCode,
    stderr: result.stderr,
    stdout: result.stdout,
  }
}

export async function runSandboxCommand(
  sandbox: E2BSandbox,
  input: SandboxCommandInput
): Promise<CommandResult> {
  try {
    return await sandbox.commands.run(input.command, {
      cwd: input.cwd,
      timeoutMs: input.timeoutMs ?? defaultCommandTimeoutMs,
    })
  } catch (error) {
    if (error instanceof CommandExitError) {
      return {
        error: error.error,
        exitCode: error.exitCode,
        stderr: error.stderr,
        stdout: error.stdout,
      }
    }

    throw error
  }
}

function requireSandboxTemplate() {
  return process.env.MILO_E2B_TEMPLATE?.trim() || "milo-codex"
}

function requireE2BApiKey() {
  const apiKey = process.env.E2B_API_KEY?.trim()

  if (apiKey === undefined || apiKey === "") {
    throw new Error("Missing E2B_API_KEY")
  }

  return apiKey
}
