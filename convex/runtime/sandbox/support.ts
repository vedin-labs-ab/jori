"use node"

import { SandboxInstance, settings } from "@blaxel/core"
import {
  assertSandboxRegion,
  sandboxConnection,
  sandboxImage,
} from "./blaxel/connection"
import { compactFailure } from "./output"
import { sandboxClonePath, shellQuote } from "./path"
import {
  commandDirectory,
  gitCloneCommand,
  gitCredentialHelperScript,
  temporaryGitCredentialPath,
  workspaceBootstrapCommand,
} from "./script"
import {
  type SandboxCloneRepositoryInput,
  type SandboxCommandInput,
  type SandboxCommandResult,
  type SandboxWriteFile,
} from "./types"

export type BlaxelSandbox = SandboxInstance
export const defaultCommandTimeoutMs = 20 * 60 * 1000
export const sandboxCleanupFailure =
  "Sandbox cleanup failed. Check this deployment's Blaxel connection and retry cleanup."

function configure() {
  const connection = sandboxConnection()
  settings.setConfig({
    apiKey: connection.apiKey,
    workspace: connection.workspace,
    disableH2: true,
  })
  return connection
}

export async function createSandbox() {
  const connection = configure()
  // Opaque names keep workspace and customer identifiers out of control-plane metadata.
  const sandbox = await SandboxInstance.create({
    name: `${connection.prefix}${crypto.randomUUID()}`,
    image: sandboxImage(),
    region: connection.region,
    memory: 4096,
    lifecycle: {
      expirationPolicies: [{ type: "ttl-idle", value: "1h", action: "delete" }],
      terminatedRetention: "5m",
    },
  })
  try {
    assertSandboxRegion(sandbox, connection)
    const bootstrap = await runSandboxCommand(sandbox, {
      command: workspaceBootstrapCommand(),
    })
    if (bootstrap.exitCode !== 0) {
      throw new Error(compactFailure(bootstrap))
    }
    return regionalClient(sandbox)
  } catch (error) {
    await sandbox.delete()
    throw error
  }
}

export async function connectSandbox(sandboxId: string) {
  const connection = configure()
  if (!sandboxId.startsWith(connection.prefix)) {
    throw new Error("Sandbox does not belong to this deployment's region.")
  }
  const sandbox = await SandboxInstance.get(sandboxId)
  assertSandboxRegion(sandbox, connection)
  return regionalClient(sandbox)
}

export async function killSandbox(sandboxId: string) {
  configure()
  try {
    const sandbox = await connectSandbox(sandboxId)
    await sandbox.delete()
  } catch (error) {
    if (isNotFound(error)) {
      return
    }
    throw new Error(sandboxCleanupFailure)
  }
}

export async function startSandboxCommand(
  sandbox: BlaxelSandbox,
  input: SandboxCommandInput
) {
  return await sandbox.process.exec({
    name: crypto.randomUUID(),
    command: `bash -c ${shellQuote(input.command)}`,
    workingDir: input.cwd,
    keepAlive: true,
    timeout: Math.ceil((input.timeoutMs ?? defaultCommandTimeoutMs) / 1000),
    waitForCompletion: false,
    restartOnFailure: false,
  })
}

export async function runSandboxCommand(
  sandbox: BlaxelSandbox,
  input: SandboxCommandInput
): Promise<SandboxCommandResult> {
  const process = await startSandboxCommand(sandbox, input)
  const result = await sandbox.process.wait(process.pid, {
    maxWait: (input.timeoutMs ?? defaultCommandTimeoutMs) + 30_000,
    interval: 250,
  })
  return normalizeCommandResult(result)
}

export function normalizeCommandResult(result: {
  exitCode: number
  stdout: string
  stderr: string
  status?: string
}): SandboxCommandResult {
  return result.status === "killed"
    ? {
        exitCode: 124,
        stdout: result.stdout,
        stderr: result.stderr,
        timedOut: true,
      }
    : {
        exitCode: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr,
      }
}

export async function waitForCommand(
  sandbox: BlaxelSandbox,
  pid: string,
  graceMs: number
) {
  const deadline = Date.now() + graceMs
  while (Date.now() < deadline) {
    const process = await sandbox.process.get(pid)
    if (process.status !== "running") {
      return true
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  return false
}

export async function readSandboxFile(sandbox: BlaxelSandbox, path: string) {
  return new Uint8Array(await (await sandbox.fs.readBinary(path)).arrayBuffer())
}

export async function writeSandboxFiles(
  sandbox: BlaxelSandbox,
  files: SandboxWriteFile[]
) {
  for (const file of files) {
    if (typeof file.content === "string") {
      await sandbox.fs.write(file.path, file.content)
    } else {
      await sandbox.fs.writeBinary(file.path, file.content)
    }
  }
}

export async function collectCommandOutput(
  sandbox: BlaxelSandbox,
  token: string
): Promise<SandboxCommandResult> {
  const directory = commandDirectory(token)
  const [stdout, stderr, exit] = await Promise.all([
    readCommandFile(sandbox, `${directory}/out`),
    readCommandFile(sandbox, `${directory}/err`),
    readCommandFile(sandbox, `${directory}/exit`),
  ])
  const exitCode = Number.parseInt(exit ?? "", 10)
  const output = { stderr: stderr ?? "", stdout: stdout ?? "" }
  return Number.isInteger(exitCode)
    ? { ...output, exitCode }
    : { ...output, exitCode: 124, timedOut: true }
}

async function readCommandFile(sandbox: BlaxelSandbox, path: string) {
  try {
    return await sandbox.fs.read(path)
  } catch (error) {
    if (isNotFound(error)) {
      return null
    }
    throw error
  }
}

function isNotFound(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    (("status" in error && error.status === 404) ||
      ("code" in error && error.code === 404))
  )
}
export async function cloneIntoSandbox(
  sandbox: BlaxelSandbox,
  input: SandboxCloneRepositoryInput
) {
  const directory = sandboxClonePath({
    repository: input.repository,
    value: input.directory,
  })
  const tokenPath = temporaryGitCredentialPath("token")
  const helperPath = temporaryGitCredentialPath("helper")

  await writeSandboxFiles(sandbox, [
    { content: input.token, path: tokenPath },
    {
      content: gitCredentialHelperScript(tokenPath, input.username),
      path: helperPath,
    },
  ])

  const result = normalizeCommandResult(
    await runSandboxCommand(sandbox, {
      command: gitCloneCommand({
        directory,
        ref: input.ref,
        helperPath,
        remoteUrl: input.remoteUrl,
        tokenPath,
      }),
    })
  )

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

function regionalClient(sandbox: BlaxelSandbox) {
  return new SandboxInstance({
    metadata: sandbox.metadata,
    spec: sandbox.spec,
    status: sandbox.status,
    forceUrl: sandbox.metadata.url,
    headers: settings.headers,
  })
}

export function sandboxName(sandbox: BlaxelSandbox) {
  const name = sandbox.metadata.name
  if (!name) {
    throw new Error("Sandbox response is missing its name.")
  }
  return name
}
