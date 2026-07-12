import { type JsonObject, toJsonObject } from "../../../contracts/json"
import {
  sandboxArtifactRuntime,
  sandboxWorkspace,
} from "../../../contracts/runtime"
import { type MiloConvexClient } from "../../convex"
import { type ConvexId } from "../../types"
import { artifactBuildCommand, artifactRuntimeFiles } from "../artifacts"
import { compactFailure } from "../output"
import { sandboxClonePath, shellQuote } from "../path"
import {
  gitCloneCommand,
  gitCredentialHelperScript,
  temporaryGitCredentialPath,
} from "../script"
import {
  type SandboxCloneRepositoryInput,
  type SandboxCommandInput,
  type SandboxCommandResult,
  type SandboxRuntime,
  type SandboxWriteFile,
} from "../types"
import {
  connectSandbox,
  createSandbox,
  type E2BSandbox,
  killE2BSandbox,
  normalizeCommandResult,
  runSandboxCommand,
} from "./support"

export class E2BSandboxRuntime implements SandboxRuntime {
  private sandbox: E2BSandbox | undefined
  private sandboxId: string | null
  private workspaceReady = false

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

    await writeSandboxFiles(sandbox, files)
  }

  async cloneRepository(input: SandboxCloneRepositoryInput) {
    const directory = sandboxClonePath({
      repository: input.repository,
      value: input.directory,
    })
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
    const result = await this.runCommand({
      command: artifactBuildCommand(workspacePath),
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
    this.workspaceReady = false
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
    if (this.sandbox === undefined) {
      this.sandbox =
        this.sandboxId === null
          ? await createSandbox(this.runId)
          : await connectSandbox(this.sandboxId)
      this.sandboxId = this.sandbox.sandboxId
      await this.convex.upsertSandbox({
        externalId: this.sandbox.sandboxId,
        runId: this.runId,
      })
    }

    await this.ensureWorkspace()

    return this.sandbox
  }

  private async ensureWorkspace() {
    if (this.workspaceReady || this.sandbox === undefined) {
      return
    }

    // Provision the artifact builder and template up front so the agent can copy
    // the template and run local checks before publishing, not only at build time.
    await writeSandboxFiles(this.sandbox, artifactRuntimeFiles())

    const result = await runSandboxCommand(this.sandbox, {
      command: workspaceBootstrapCommand(),
    })

    if (result.exitCode !== 0) {
      throw new Error(compactFailure(normalizeCommandResult(result)))
    }

    this.workspaceReady = true
  }
}

async function writeSandboxFiles(
  sandbox: E2BSandbox,
  files: SandboxWriteFile[]
) {
  await sandbox.files.write(
    files.map((file) => ({
      data:
        file.content instanceof Uint8Array
          ? new Uint8Array(file.content).buffer
          : file.content,
      path: file.path,
    }))
  )
}

export function workspaceBootstrapCommand() {
  return [
    "set -eu",
    `mkdir -p ${shellQuote(sandboxWorkspace)} ${shellQuote(sandboxArtifactRuntime)}`,
    `chmod 755 ${shellQuote(sandboxWorkspace)}`,
  ].join("\n")
}

function parseArtifactBuild(stdout: string) {
  const parsed = JSON.parse(stdout) as unknown

  try {
    return toJsonObject(parsed)
  } catch {
    throw new Error("Artifact builder returned an invalid payload.")
  }
}
