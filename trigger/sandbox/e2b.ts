import { type JsonObject, toJsonObject } from "../../contracts/json"
import { type MiloConvexClient } from "../convex"
import { type ConvexId } from "../types"
import {
  artifactBuildCommand,
  artifactRunnerFile,
  artifactRuntimeFiles,
} from "./artifacts"
import {
  connectSandbox,
  createSandbox,
  type E2BSandbox,
  killE2BSandbox,
  normalizeCommandResult,
  runSandboxCommand,
  toArrayBuffer,
} from "./e2b-support"
import { compactFailure } from "./output"
import { sandboxPath } from "./path"
import {
  gitCloneCommand,
  gitCredentialHelperScript,
  temporaryGitCredentialPath,
} from "./script"
import {
  type SandboxCloneRepositoryInput,
  type SandboxCommandInput,
  type SandboxCommandResult,
  type SandboxRuntime,
  type SandboxWriteFile,
} from "./types"

const defaultCommandTimeoutMs = 20 * 60 * 1000

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

  async cloneRepository(input: SandboxCloneRepositoryInput) {
    const directory = sandboxPath(input.directory ?? "repository")
    const tokenPath = temporaryGitCredentialPath("token")
    const helperPath = temporaryGitCredentialPath("helper")

    await this.writeFiles([
      { content: input.token, path: tokenPath },
      {
        content: gitCredentialHelperScript(tokenPath, input.username),
        path: helperPath,
      },
    ])

    const result = await this.runCommand({
      command: gitCloneCommand({
        directory,
        ref: input.ref,
        helperPath,
        remoteUrl: input.remoteUrl,
        tokenPath,
      }),
    })

    if (result.exitCode !== 0) {
      throw new Error(compactFailure(result))
    }

    return {
      directory,
      git: true as const,
      ...(input.ref === undefined ? {} : { ref: input.ref }),
      remoteUrl: input.remoteUrl,
      repository: input.repository,
    }
  }

  async buildArtifact(workspacePath: string): Promise<JsonObject> {
    await this.prepareArtifactRuntime()
    const result = await this.runCommand({
      command: artifactBuildCommand(workspacePath),
      timeoutMs: defaultCommandTimeoutMs,
    })

    if (result.exitCode !== 0) {
      throw new Error(compactFailure(result))
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

  async release() {
    if (this.sandboxId === null) {
      return null
    }

    const lease = await this.convex.releaseSandbox({
      externalId: this.sandboxId,
      runId: this.runId,
    })

    return lease === null
      ? null
      : { expiresAt: lease.expiresAt, sandboxId: this.sandboxId }
  }

  private async ensureSandbox() {
    if (this.sandbox !== undefined) {
      return this.sandbox
    }

    if (this.sandboxId !== null) {
      this.sandbox = await connectSandbox(this.sandboxId)
      await this.persistSandbox()

      return this.sandbox
    }

    this.sandbox = await createSandbox(this.runId)
    this.sandboxId = this.sandbox.sandboxId
    await this.persistSandbox()

    return this.sandbox
  }

  private async persistSandbox() {
    if (this.sandbox === undefined) {
      return
    }

    await this.convex.upsertSandbox({
      externalId: this.sandbox.sandboxId,
      runId: this.runId,
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

function parseArtifactBuild(stdout: string) {
  const parsed = JSON.parse(stdout) as unknown

  try {
    return toJsonObject(parsed)
  } catch {
    throw new Error("Artifact builder returned an invalid payload.")
  }
}
