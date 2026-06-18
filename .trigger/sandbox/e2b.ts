import { type CommandResult, Sandbox } from "e2b"
import { type Id } from "../../convex/_generated/dataModel"
import { type MiloConvexClient } from "../convex"
import {
  type SandboxCommandInput,
  type SandboxCommandResult,
  type SandboxRuntime,
} from "./types"

type E2BSandbox = Awaited<ReturnType<typeof Sandbox.create>>

const defaultCommandTimeoutMs = 20 * 60 * 1000
const defaultSandboxTimeoutMs = 60 * 60 * 1000

export class E2BSandboxRuntime implements SandboxRuntime {
  private sandbox: E2BSandbox | undefined
  private sandboxId: string | null

  constructor(
    private readonly convex: MiloConvexClient,
    private readonly runId: Id<"runs">,
    private readonly executionId: Id<"executions">,
    sandboxId: string | null
  ) {
    this.sandboxId = sandboxId
  }

  async runCommand(input: SandboxCommandInput): Promise<SandboxCommandResult> {
    const sandbox = await this.ensureSandbox()
    const result = await sandbox.commands.run(input.command, {
      cwd: input.cwd,
      timeoutMs: input.timeoutMs ?? defaultCommandTimeoutMs,
    })

    return normalizeCommandResult(result)
  }

  async cleanup() {
    if (this.sandboxId === null) {
      return
    }

    await killE2BSandbox({
      convex: this.convex,
      executionId: this.executionId,
      runId: this.runId,
      sandboxId: this.sandboxId,
    })
    this.sandbox = undefined
    this.sandboxId = null
  }

  private async ensureSandbox() {
    if (this.sandbox !== undefined) {
      return this.sandbox
    }

    if (this.sandboxId !== null) {
      this.sandbox = await connectSandbox(this.sandboxId)
      await this.persistSandbox("reconnected")

      return this.sandbox
    }

    this.sandbox = await createSandbox(this.runId, this.executionId)
    this.sandboxId = this.sandbox.sandboxId
    await this.persistSandbox("created")

    return this.sandbox
  }

  private async persistSandbox(status: "created" | "reconnected") {
    if (this.sandbox === undefined) {
      return
    }

    await this.convex.upsertSandbox({
      executionId: this.executionId,
      runId: this.runId,
      sandboxId: this.sandbox.sandboxId,
      status,
      traceHost: this.sandbox.sandboxDomain,
    })
  }
}

export async function killE2BSandbox(args: {
  convex: MiloConvexClient
  executionId: Id<"executions">
  runId: Id<"runs">
  sandboxId: string
}) {
  await Sandbox.kill(args.sandboxId, { apiKey: requireE2BApiKey() }).catch(
    () => false
  )
  await args.convex.markSandboxCleaned(args)
}

async function connectSandbox(sandboxId: string) {
  return await Sandbox.connect(sandboxId, {
    apiKey: requireE2BApiKey(),
    timeoutMs: defaultSandboxTimeoutMs,
  })
}

async function createSandbox(runId: Id<"runs">, executionId: Id<"executions">) {
  return await Sandbox.create(requireSandboxTemplate(), {
    apiKey: requireE2BApiKey(),
    allowInternetAccess: true,
    lifecycle: {
      autoResume: true,
      onTimeout: "pause",
    },
    metadata: {
      app: "milo",
      executionId,
      runId,
      runtime: "trigger",
    },
    timeoutMs: defaultSandboxTimeoutMs,
  })
}

function normalizeCommandResult(result: CommandResult): SandboxCommandResult {
  return {
    exitCode: result.exitCode,
    stderr: result.stderr,
    stdout: result.stdout,
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
