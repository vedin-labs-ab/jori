"use node"

import {
  CommandExitError,
  type CommandResult,
  type Sandbox,
  type Username,
} from "e2b"
import { batchSandboxWrites, type SandboxWriteFile } from "./files"
import { formatError } from "./trace"

type E2BSandbox = Awaited<ReturnType<typeof Sandbox.create>>

export async function runCommand(
  sandbox: E2BSandbox,
  command: string,
  options: {
    cwd?: string
    envs?: Record<string, string>
    onStdout?: (data: string) => void
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

    return {
      exitCode: 124,
      error: formatError(error),
      stdout: "",
      stderr: "",
    } satisfies CommandResult
  }
}

export async function writeSandboxFiles(
  sandbox: E2BSandbox,
  files: SandboxWriteFile[],
  requestTimeoutMs: number
) {
  for (const batch of batchSandboxWrites(files)) {
    await sandbox.files.write(batch, {
      gzip: true,
      requestTimeoutMs,
      useOctetStream: true,
    })
  }
}
