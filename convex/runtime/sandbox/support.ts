"use node"

import {
  CommandExitError,
  type CommandHandle,
  type CommandResult,
  FileNotFoundError,
  Sandbox,
} from "e2b"
import { type Id } from "../../_generated/dataModel"
import { compactFailure } from "./output"
import { sandboxClonePath } from "./path"
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
} from "./types"

export type E2BSandbox = Awaited<ReturnType<typeof Sandbox.create>>

export const defaultCommandTimeoutMs = 20 * 60 * 1000

const defaultSandboxTimeoutMs = 60 * 60 * 1000
/** The exit code GNU timeout reports, so a command cut short reads the way a
 *  shell user would expect it to. */
const timedOutExitCode = 124

export async function createSandbox(runId: Id<"runs">) {
  const sandbox = await Sandbox.create(requireSandboxTemplate(), {
    apiKey: requireE2BApiKey(),
    allowInternetAccess: true,
    lifecycle: {
      autoResume: true,
      onTimeout: "pause",
    },
    metadata: {
      app: "jori",
      runId,
    },
    timeoutMs: defaultSandboxTimeoutMs,
  })

  // Only a fresh sandbox needs this: the workspace survives every reconnect
  // to one that already ran it.
  const bootstrap = await runSandboxCommand(sandbox, {
    command: workspaceBootstrapCommand(),
  })

  if (bootstrap.exitCode !== 0) {
    throw new Error(compactFailure(normalizeCommandResult(bootstrap)))
  }

  return sandbox
}

export async function connectSandbox(sandboxId: string) {
  return await Sandbox.connect(sandboxId, {
    apiKey: requireE2BApiKey(),
    timeoutMs: defaultSandboxTimeoutMs,
  })
}

export async function killSandbox(sandboxId: string) {
  // A sandbox that already timed out or was killed is the outcome this asks
  // for, so its absence is not a failure.
  await Sandbox.kill(sandboxId, { apiKey: requireE2BApiKey() }).catch(
    () => false
  )
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

export function normalizeCommandResult(
  result: CommandResult
): SandboxCommandResult {
  return {
    exitCode: result.exitCode,
    stderr: result.stderr,
    stdout: result.stdout,
  }
}

/** Resolves once the command finished, or false once the grace window closed
 *  and the run should park on it instead. */
export async function waitForCommand(
  handle: CommandHandle,
  graceMs: number
): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const grace = new Promise<false>((resolve) => {
    timer = setTimeout(() => resolve(false), graceMs)
  })

  try {
    return await Promise.race([awaitCommand(handle), grace])
  } finally {
    clearTimeout(timer)
  }
}

export async function collectCommandOutput(
  sandbox: E2BSandbox,
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

  // The exit file is written last, so a missing one means the command never
  // reached its end: it was killed at its deadline.
  return Number.isInteger(exitCode)
    ? { ...output, exitCode }
    : { ...output, exitCode: timedOutExitCode, timedOut: true }
}

export async function cloneIntoSandbox(
  sandbox: E2BSandbox,
  input: SandboxCloneRepositoryInput
) {
  const directory = sandboxClonePath({
    repository: input.repository,
    value: input.directory,
  })
  const tokenPath = temporaryGitCredentialPath("token")
  const helperPath = temporaryGitCredentialPath("helper")

  await sandbox.files.write([
    { data: input.token, path: tokenPath },
    {
      data: gitCredentialHelperScript(tokenPath, input.username),
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

async function awaitCommand(handle: CommandHandle) {
  try {
    await handle.wait()
  } catch (error) {
    // The wrapper always exits 0 and its files describe what ran either way,
    // so nothing here is worth failing the step over. Swallowing it also
    // keeps the abandoned side of the race from rejecting unobserved.
    if (!(error instanceof CommandExitError)) {
      console.warn("Sandbox command did not report its exit", error)
    }
  }

  return true
}

async function readCommandFile(sandbox: E2BSandbox, path: string) {
  try {
    return await sandbox.files.read(path, { format: "text" })
  } catch (error) {
    if (error instanceof FileNotFoundError) {
      return null
    }

    throw error
  }
}

/** Template names are global to the E2B team, so each environment names its
 *  own; the default is the one a development deployment builds. */
function requireSandboxTemplate() {
  return process.env.JORI_E2B_TEMPLATE?.trim() || "jori-sandbox"
}

function requireE2BApiKey() {
  const apiKey = process.env.E2B_API_KEY?.trim()

  if (apiKey === undefined || apiKey === "") {
    throw new Error("Missing E2B_API_KEY")
  }

  return apiKey
}
