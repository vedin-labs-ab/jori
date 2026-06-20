import { CommandExitError, type CommandResult, Sandbox } from "e2b"
import { type MiloConvexClient } from "../convex"
import { type ConvexId } from "../types"
import {
  artifactBuildCommand,
  artifactRunnerFile,
  artifactRuntimeFiles,
} from "./artifacts"
import { toArrayBuffer } from "./buffer"
import { sandboxPath, shellQuote } from "./path"
import {
  type SandboxCommandInput,
  type SandboxCommandResult,
  type SandboxExtractTarballInput,
  type SandboxRuntime,
  type SandboxWriteFile,
} from "./types"

type E2BSandbox = Awaited<ReturnType<typeof Sandbox.create>>

const defaultCommandTimeoutMs = 20 * 60 * 1000
const defaultSandboxTimeoutMs = 60 * 60 * 1000

export class E2BSandboxRuntime implements SandboxRuntime {
  private artifactRuntimeReady = false
  private sandbox: E2BSandbox | undefined
  private sandboxId: string | null

  constructor(
    private readonly convex: MiloConvexClient,
    private readonly runId: ConvexId<"runs">,
    sandboxId: string | null
  ) {
    this.sandboxId = sandboxId
  }

  async runCommand(input: SandboxCommandInput): Promise<SandboxCommandResult> {
    const sandbox = await this.ensureSandbox()
    const result = await runSandboxCommand(sandbox, input)

    return normalizeCommandResult(result)
  }

  async readFile(path: string) {
    const sandbox = await this.ensureSandbox()

    return await sandbox.files.read(path, { format: "bytes" })
  }

  async writeFiles(files: SandboxWriteFile[]) {
    const sandbox = await this.ensureSandbox()

    await sandbox.files.write(
      files.map((file) => ({
        data:
          file.content instanceof Uint8Array
            ? toArrayBuffer(file.content)
            : file.content,
        path: file.path,
      }))
    )
  }

  async extractTarball(input: SandboxExtractTarballInput) {
    const archivePath = `/tmp/milo-github-${Date.now()}-${Math.random().toString(36).slice(2)}.tar.gz`
    const directory = sandboxPath(input.directory ?? "repository")

    await this.writeFiles([{ content: input.bytes, path: archivePath }])

    const result = await this.runCommand({
      command: [
        "set -eu",
        `directory=${shellQuote(directory)}`,
        'if [ -d "$directory" ] && [ -n "$(ls -A "$directory")" ]; then',
        '  echo "Clone directory is not empty" >&2',
        "  exit 1",
        "fi",
        'mkdir -p "$directory"',
        `tar -xzf ${shellQuote(archivePath)} --strip-components 1 -C "$directory"`,
        `rm -f ${shellQuote(archivePath)}`,
      ].join("\n"),
    })

    if (result.exitCode !== 0) {
      throw new Error(compactCommandFailure(result))
    }

    return {
      directory,
      repository: input.repository,
    }
  }

  async buildArtifact(workspacePath: string): Promise<Record<string, unknown>> {
    await this.prepareArtifactRuntime()
    const result = await this.runCommand({
      command: artifactBuildCommand(workspacePath),
      timeoutMs: defaultCommandTimeoutMs,
    })

    if (result.exitCode !== 0) {
      throw new Error(compactCommandFailure(result))
    }

    return parseArtifactBuild(result.stdout)
  }

  async cleanup() {
    if (this.sandboxId === null) {
      return
    }

    await killE2BSandbox({
      convex: this.convex,
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

    this.sandbox = await createSandbox(this.runId)
    this.sandboxId = this.sandbox.sandboxId
    await this.persistSandbox("created")

    return this.sandbox
  }

  private async persistSandbox(status: "created" | "reconnected") {
    if (this.sandbox === undefined) {
      return
    }

    await this.convex.upsertSandbox({
      runId: this.runId,
      sandboxId: this.sandbox.sandboxId,
      status,
      traceHost: this.sandbox.sandboxDomain,
    })
  }

  private async prepareArtifactRuntime() {
    if (this.artifactRuntimeReady) {
      return
    }

    await this.writeFiles([...artifactRuntimeFiles(), artifactRunnerFile()])
    this.artifactRuntimeReady = true
  }
}

export async function killE2BSandbox(args: {
  convex: MiloConvexClient
  sandboxId: string
}) {
  await Sandbox.kill(args.sandboxId, { apiKey: requireE2BApiKey() }).catch(
    () => false
  )
  await args.convex.markSandboxCleaned({
    sandboxId: args.sandboxId,
  })
}

async function connectSandbox(sandboxId: string) {
  return await Sandbox.connect(sandboxId, {
    apiKey: requireE2BApiKey(),
    timeoutMs: defaultSandboxTimeoutMs,
  })
}

async function createSandbox(runId: ConvexId<"runs">) {
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

function normalizeCommandResult(result: CommandResult): SandboxCommandResult {
  return {
    exitCode: result.exitCode,
    stderr: result.stderr,
    stdout: result.stdout,
  }
}

async function runSandboxCommand(
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

function compactCommandFailure(result: SandboxCommandResult) {
  const output = [result.stdout, result.stderr]
    .filter((value) => value.trim() !== "")
    .join("\n")
    .slice(0, 12_000)

  return output === ""
    ? `Command failed with exit code ${result.exitCode}.`
    : output
}

function parseArtifactBuild(stdout: string) {
  const parsed = JSON.parse(stdout) as unknown

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Artifact builder returned an invalid payload.")
  }

  return parsed as Record<string, unknown>
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
